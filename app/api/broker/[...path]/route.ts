import { NextRequest, NextResponse } from "next/server";
import { createIbkrBrokerEngine } from "@/lib/broker-engine";
import {
  classifyIbkrProxyError,
  IBKR_SERVICE_UNAVAILABLE,
  resolveIbkrServicePath,
} from "@/lib/ibkr/broker-path-map";

/**
 * Internal IBKR proxy — always targets the FastAPI service (never paper engine).
 * Short aliases: /health /status /account /positions /orders /connect
 * ANALYSIS_ONLY callers should only use read endpoints.
 */
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const rawPath = `/${path.join("/")}`;
    const servicePath = resolveIbkrServicePath(rawPath);
    const method = request.method;
    const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
    const engine = createIbkrBrokerEngine();
    const result = await engine.request({
      path: servicePath,
      queryString: request.nextUrl.search,
      method,
      body,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Broker service error";
    const name = error instanceof Error ? error.name : "";
    const classified = classifyIbkrProxyError(message);
    const payload =
      error && typeof error === "object" && "payload" in error
        ? (error as { payload?: Record<string, unknown> }).payload
        : undefined;

    if (payload && typeof payload === "object") {
      return NextResponse.json(
        {
          connected: false,
          ...payload,
          error: String(payload.error ?? message),
          state: String(payload.state ?? classified.state),
        },
        { status: 503 },
      );
    }

    const isProcessDown =
      name === "IbkrServiceUnavailableError" && classified.state === "SERVICE_UNAVAILABLE";

    return NextResponse.json(
      {
        connected: false,
        state: isProcessDown ? IBKR_SERVICE_UNAVAILABLE.state : classified.state,
        error: isProcessDown ? IBKR_SERVICE_UNAVAILABLE.error : classified.error || message,
      },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
