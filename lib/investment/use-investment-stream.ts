"use client";

import { useEffect, useRef, useState } from "react";

export type StreamEvent = {
  type: string;
  at: string;
  payload?: unknown;
};

export function useInvestmentStream(onEvent?: (event: StreamEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      es = new EventSource("/api/investment/stream");

      es.onopen = () => setConnected(true);

      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as StreamEvent;
          if (event.type === "heartbeat") return;
          setLastEvent(event);
          onEventRef.current?.(event);
        } catch {
          /* ignore */
        }
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!cancelled) {
          retryTimer = setTimeout(connect, 5_000);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, []);

  return { connected, lastEvent };
}
