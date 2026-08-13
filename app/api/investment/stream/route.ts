import { NextRequest } from "next/server";
import {
  getRecentInvestmentEvents,
  subscribeInvestmentEvents,
  type InvestmentEvent,
} from "@/lib/notifications/investment-events";
import { startPositionMonitor } from "@/src/core/trading/position-monitor";
import { startTelegramPolling } from "@/lib/notifications/telegram-poll";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** SSE stream for real-time investment events (replaces 30s polling). */
export async function GET(req: NextRequest) {
  startPositionMonitor();
  startTelegramPolling();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: InvestmentEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      for (const e of getRecentInvestmentEvents(5).reverse()) send(e);
      send({ type: "heartbeat", at: new Date().toISOString() });

      const unsubscribe = subscribeInvestmentEvents(send);
      const heartbeat = setInterval(() => {
        if (closed) return;
        send({ type: "heartbeat", at: new Date().toISOString() });
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
