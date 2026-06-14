import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
}: AuditInput) {
  await db.insert(auditLogs).values({
    actorId: actorId ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata,
  });
}
