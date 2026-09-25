/**
 * ForgeOS — API Route: /api/trading/ibkr
 * Puente server-side entre el TradingEngine y el servicio IBKR FastAPI.
 * Routes through lib/ibkr/service-client.ts (no duplicated HTTP client).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  IbkrServiceUnavailableError,
  ibkrServiceFetch,
} from "@/lib/ibkr/service-client";
import {
  fetchTradingAccountSnapshot,
  fetchTradingPosition,
  fetchTradingPrice,
} from "@/lib/trading/ibkr-data";

function toErrorResponse(err: unknown) {
  if (err instanceof IbkrServiceUnavailableError) {
    return NextResponse.json(
      { ...(err.payload ?? {}), error: err.message },
      { status: 503 },
    );
  }
  console.error("[IBKR Route]", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Internal error" },
    { status: 500 },
  );
}

// ── GET — consultas de datos ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const ticker = searchParams.get("ticker");

  try {
    switch (action) {
      case "account":
        return NextResponse.json(await fetchTradingAccountSnapshot());

      case "price": {
        if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
        return NextResponse.json(await fetchTradingPrice(ticker));
      }

      case "position": {
        if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
        const position = await fetchTradingPosition(ticker);
        return NextResponse.json({ position: position ?? null });
      }

      case "cycle-status": {
        return NextResponse.json({
          status: "ok",
          lastCycle: global.__lastTradingCycle ?? null,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ── POST — crear propuesta (PENDING) — no ejecuta live orders ─────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticker, direction, shares, orderType, limitPrice, approvalId } = body;

    if (action !== "order") {
      return NextResponse.json({ error: "Unknown POST action" }, { status: 400 });
    }

    if (!ticker || !direction || !shares) {
      return NextResponse.json(
        { error: "ticker, direction and shares required" },
        { status: 400 },
      );
    }

    const limit =
      typeof limitPrice === "number" && limitPrice > 0
        ? limitPrice
        : undefined;

    if (!limit) {
      return NextResponse.json(
        {
          error:
            "limitPrice required — trading IBKR bridge only creates LMT proposals via service-client",
        },
        { status: 400 },
      );
    }

    const proposal = await ibkrServiceFetch<{
      id?: string;
      status?: string;
    }>("/api/proposals", {
      method: "POST",
      body: JSON.stringify({
        symbol: String(ticker).toUpperCase(),
        side: direction === "SELL" ? "SELL" : "BUY",
        quantity: Number(shares),
        order_type: "LMT",
        limit_price: limit,
        sec_type: "STK",
        currency: "USD",
        exchange: "SMART",
        rationale: `ForgeOS trading bridge proposal (approvalId=${approvalId ?? "n/a"}; orderType=${orderType ?? "LMT"})`,
        strategy_id: "forgeos-trading-engine",
      }),
    });

    return NextResponse.json({
      orderId: proposal.id ?? "proposal-created",
      proposalStatus: proposal.status ?? "PENDING",
      note: "Created as broker proposal PENDING — requires explicit decision+execute on FastAPI",
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __lastTradingCycle: unknown;
}
