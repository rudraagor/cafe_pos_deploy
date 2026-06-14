import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  orderItems,
  orders,
  orderTables,
  products,
  tables,
} from "@/lib/db/schema";
import { modifiersAllowNote, normalizeModifiers } from "@/lib/pos/modifiers";
import { getActivePromotions, generateOrderNumber } from "@/lib/pos/queries";
import { computeOrder } from "@/lib/pos/pricing";
import { verifyTableOrderToken } from "@/lib/pos/qr-ordering";
import { getLatestOpenSession } from "@/lib/pos/session";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { qrOrderPayloadSchema } from "@/lib/validations/qr-order";

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const ipLimit = checkRateLimit({
    scope: "api:qr_order_submit:ip",
    identifier: ip,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!ipLimit.ok) return rateLimitResponse(ipLimit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = qrOrderPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid order." },
      { status: 400 },
    );
  }

  const verified = verifyTableOrderToken(parsed.data.token);
  if (!verified) {
    return Response.json({ error: "Invalid table QR code." }, { status: 403 });
  }

  const tokenLimit = checkRateLimit({
    scope: "api:qr_order_submit:table",
    identifier: `${verified.tableId}:${ip}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!tokenLimit.ok) return rateLimitResponse(tokenLimit);

  const [session, table] = await Promise.all([
    getLatestOpenSession(),
    db.query.tables.findFirst({
      where: and(eq(tables.id, verified.tableId), eq(tables.active, true)),
      with: { floor: true },
    }),
  ]);

  if (!table) {
    return Response.json({ error: "This table QR is no longer active." }, { status: 404 });
  }
  if (!session) {
    return Response.json(
      { error: "The cafe is not accepting QR orders right now." },
      { status: 409 },
    );
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const dbProducts = await db.query.products.findMany({
    where: and(isNull(products.archivedAt), eq(products.isOutOfStock, false)),
  });
  const productMap = new Map(dbProducts.map((product) => [product.id, product]));

  const pricingItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product || !productIds.includes(product.id)) return null;
    const supportedModifiers = normalizeModifiers(product.supportedModifiers);
    const modifiers = normalizeModifiers(item.modifiers);
    const unsupportedModifier = modifiers.find(
      (modifier) => !supportedModifiers.includes(modifier),
    );
    if (unsupportedModifier) return null;
    const note = item.note?.trim() || undefined;
    if (note && !modifiersAllowNote(supportedModifiers)) return null;
    return {
      productId: product.id,
      name: product.name,
      unitPrice: Number(product.price),
      taxRate: Number(product.taxRate),
      qty: item.qty,
      isKitchenItem: product.isKitchenItem,
      categoryId: product.categoryId,
      modifiers,
      note,
    };
  });

  if (pricingItems.some((item) => item === null)) {
    return Response.json(
      { error: "One of the selected items is unavailable." },
      { status: 400 },
    );
  }

  const promotions = await getActivePromotions();
  const computed = computeOrder(
    pricingItems.filter(
      (item): item is NonNullable<(typeof pricingItems)[number]> => item !== null,
    ),
    { promotions },
  );

  let orderId: { id: string; orderNumber: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      orderId = await db.transaction(async (tx) => {
        const customerName = parsed.data.customerName.trim();
        const customerEmail = parsed.data.customerEmail.trim().toLowerCase();
        let customerId: string | null = null;

        const existingCustomer = await tx.query.customers.findFirst({
          where: eq(customers.email, customerEmail),
        });
        if (existingCustomer) {
          customerId = existingCustomer.id;
          if (existingCustomer.name !== customerName) {
            await tx
              .update(customers)
              .set({ name: customerName })
              .where(eq(customers.id, existingCustomer.id));
          }
        } else {
          const [createdCustomer] = await tx
            .insert(customers)
            .values({ name: customerName, email: customerEmail })
            .returning({ id: customers.id });
          customerId = createdCustomer.id;
        }

        const orderNumber = await generateOrderNumber(tx);
        const [createdOrder] = await tx
          .insert(orders)
          .values({
            orderNumber,
            sessionId: session.id,
            tableId: table.id,
            fulfillmentType: "dine_in",
            customerId,
            employeeId: null,
            status: "unapproved",
            kdsStage: "to_cook",
            subtotal: computed.subtotal.toFixed(2),
            tax: computed.tax.toFixed(2),
            discountTotal: computed.discountTotal.toFixed(2),
            total: computed.total.toFixed(2),
            sentToKitchenAt: null,
            updatedAt: new Date(),
          })
          .returning({ id: orders.id, orderNumber: orders.orderNumber });

        await tx.insert(orderItems).values(
          computed.lines.map((line) => ({
            orderId: createdOrder.id,
            productId: line.productId,
            nameSnapshot: line.name,
            unitPrice: line.unitPrice.toFixed(2),
            quantity: line.qty,
            taxRateSnapshot: line.taxRate.toFixed(2),
            lineDiscount: line.lineDiscount.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
            isKitchenItem: line.isKitchenItem,
            modifiers: normalizeModifiers(line.modifiers),
            note: line.note?.trim() || null,
          })),
        );

        await tx.insert(orderTables).values({
          orderId: createdOrder.id,
          tableId: table.id,
          isPrimary: true,
        });

        return createdOrder;
      });
      break;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        return Response.json(
          { error: "Could not submit this QR order." },
          { status: 500 },
        );
      }
    }
  }

  if (!orderId) {
    return Response.json(
      { error: "Could not generate an order number. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    orderId: orderId.id,
    orderNumber: orderId.orderNumber,
    message: "Order sent for waiter approval.",
  });
}

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}
