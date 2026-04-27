import { auth } from "@/auth";
import { subscribe } from "@/lib/server/event-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// SSE event stream. Clients open `EventSource('/api/openproject/events?project=ID')`
// and the server pushes JSON-encoded fan-out events from the in-process bus.
//
// Heartbeat every 25s as a comment-line so proxies (NGINX, Vercel) and
// browsers don't kill the long-poll for being idle. Dead connections are
// detected by the `aborted` signal, at which point we tear down the
// subscriber and clear the timer.
export async function GET(req) {
  const session = await auth();
  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("project") || null;

  const encoder = new TextEncoder();
  let unsubscribe = null;
  let heartbeat = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream was closed underneath us — bail out cleanly.
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        try {
          unsubscribe?.();
        } catch {
          // ignore
        }
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Initial connect: name the event "ready" so clients can hook a
      // ready handler if they want to wait before treating updates as
      // authoritative.
      send(`event: ready\ndata: ${JSON.stringify({ projectId, ts: Date.now() })}\n\n`);

      unsubscribe = subscribe({ projectId }, (event) => {
        send(
          `event: ${event.type || "message"}\ndata: ${JSON.stringify(event)}\n\n`,
        );
      });

      heartbeat = setInterval(() => {
        // Comment-only line. Browsers ignore these but they keep the
        // pipe warm.
        send(`: ping ${Date.now()}\n\n`);
      }, 25_000);

      // Tear down when the client disconnects.
      const signal = req.signal;
      if (signal) {
        if (signal.aborted) cleanup();
        else signal.addEventListener("abort", cleanup);
      }
    },
    cancel() {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
      clearInterval(heartbeat);
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
