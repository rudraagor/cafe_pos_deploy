import {
  KDS_CHANGED_EVENT,
  realtimeBus,
  type KdsChangedPayload,
} from "@/lib/realtime/bus";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = checkRateLimit({
    scope: "api:kds:stream",
    identifier: clientIpFromHeaders(request.headers),
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return rateLimitResponse(limit);

  const encoder = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let listener: ((payload: KdsChangedPayload) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function enqueue(chunk: string) {
        controller.enqueue(encoder.encode(chunk));
      }

      function send(payload: KdsChangedPayload) {
        enqueue(`event: kds:changed\ndata: ${JSON.stringify(payload)}\n\n`);
      }

      function cleanup() {
        if (listener) realtimeBus.off(KDS_CHANGED_EVENT, listener);
        if (keepAlive) clearInterval(keepAlive);
        listener = null;
        keepAlive = null;
      }

      enqueue(":connected\n\n");
      listener = send;
      realtimeBus.on(KDS_CHANGED_EVENT, listener);
      keepAlive = setInterval(() => enqueue(":keep-alive\n\n"), 25000);
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      if (listener) realtimeBus.off(KDS_CHANGED_EVENT, listener);
      if (keepAlive) clearInterval(keepAlive);
      listener = null;
      keepAlive = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
