import {
  REPORTS_CHANGED_EVENT,
  realtimeBus,
  type ReportsChangedPayload,
} from "@/lib/realtime/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let listener: ((payload: ReportsChangedPayload) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function enqueue(chunk: string) {
        controller.enqueue(encoder.encode(chunk));
      }

      function send(payload: ReportsChangedPayload) {
        enqueue(`event: reports:changed\ndata: ${JSON.stringify(payload)}\n\n`);
      }

      function cleanup() {
        if (listener) realtimeBus.off(REPORTS_CHANGED_EVENT, listener);
        if (keepAlive) clearInterval(keepAlive);
        listener = null;
        keepAlive = null;
      }

      enqueue(":connected\n\n");
      listener = send;
      realtimeBus.on(REPORTS_CHANGED_EVENT, listener);
      keepAlive = setInterval(() => enqueue(":keep-alive\n\n"), 25000);
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      if (listener) realtimeBus.off(REPORTS_CHANGED_EVENT, listener);
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
