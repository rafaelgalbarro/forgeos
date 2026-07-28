/** Program 6500 — Trace context stub */

import { isTracingEnabled } from "./config";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  service: string;
  startedAt: string;
}

function randomId(len = 16): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function createTraceContext(service = "forgeos-production"): TraceContext | null {
  if (!isTracingEnabled()) return null;
  return {
    traceId: randomId(32),
    spanId: randomId(16),
    service,
    startedAt: new Date().toISOString(),
  };
}

export function childSpan(parent: TraceContext): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: randomId(16),
    parentSpanId: parent.spanId,
    service: parent.service,
    startedAt: new Date().toISOString(),
  };
}

export function traceHeaders(ctx: TraceContext | null): Record<string, string> {
  if (!ctx) return {};
  return {
    "x-trace-id": ctx.traceId,
    "x-span-id": ctx.spanId,
  };
}
