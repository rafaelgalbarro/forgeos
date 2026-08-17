/**
 * Maps short /api/broker/* aliases to FastAPI IBKR service paths.
 * Frontend should prefer short paths: /health /status /account /positions /orders
 */

const SHORT_ALIASES: Record<string, string> = {
  "/health": "/health",
  "/status": "/api/ibkr/status",
  "/account": "/api/ibkr/account",
  "/positions": "/api/ibkr/positions",
  "/orders": "/api/ibkr/orders",
  "/connect": "/api/ibkr/connect",
  "/history": "/api/ibkr/history",
  "/quote": "/api/ibkr/quote",
  "/forex/quotes": "/api/forex/quotes",
  "/forex/positions": "/api/forex/positions",
  "/forex/history": "/api/forex/history",
  "/forex/order": "/api/forex/order",
};

export function resolveIbkrServicePath(requestPath: string): string {
  const normalized = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
  if (SHORT_ALIASES[normalized]) return SHORT_ALIASES[normalized];
  // Pass through canonical FastAPI paths and proposals/control routes.
  return normalized;
}

export const IBKR_SERVICE_UNAVAILABLE = {
  connected: false,
  state: "SERVICE_UNAVAILABLE" as const,
  error: "IBKR service is not running",
};

export const IBKR_TWS_OFFLINE = {
  connected: false,
  state: "TWS_OFFLINE" as const,
  error: "TWS/Gateway offline",
};

export function classifyIbkrProxyError(message: string): {
  state: "SERVICE_UNAVAILABLE" | "TWS_OFFLINE" | "AUTH_REQUIRED" | "UNAVAILABLE";
  error: string;
} {
  const text = message.trim() || "Broker service error";
  if (/Falta IBKR_INTERNAL_API_KEY|API[_ ]?KEY|401|unauthorized/i.test(text)) {
    return { state: "AUTH_REQUIRED", error: text };
  }
  if (/TWS|Gateway offline|nothing listening|Couldn't connect to TWS|settimeout/i.test(text)) {
    return { state: "TWS_OFFLINE", error: text };
  }
  if (/not running|ECONNREFUSED|fetch failed|unreachable|SERVICE_UNAVAILABLE/i.test(text)) {
    return { state: "SERVICE_UNAVAILABLE", error: IBKR_SERVICE_UNAVAILABLE.error };
  }
  return { state: "UNAVAILABLE", error: text };
}
