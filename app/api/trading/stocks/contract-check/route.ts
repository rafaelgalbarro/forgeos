/**
 * GET /api/trading/stocks/contract-check
 * List each European equity with resolved IBKR contract (conId, exchange, currency, name)
 * or error — for pre-trade verification. Resolves missing contracts once per day.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAllEuContracts } from "@/lib/trading/ibkr-eu-contracts";

function authorize(req: NextRequest): boolean {
  const key = process.env.IBKR_INTERNAL_API_KEY?.trim();
  if (!key) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-internal-api-key") === key;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolveMissing =
    req.nextUrl.searchParams.get("resolve") !== "0" &&
    req.nextUrl.searchParams.get("resolve") !== "false";

  try {
    const rows = await checkAllEuContracts({ resolveMissing });
    const ok = rows.filter((r) => r.ok).length;
    const failed = rows.length - ok;
    return NextResponse.json({
      ok: failed === 0,
      at: new Date().toISOString(),
      total: rows.length,
      resolved: ok,
      failed,
      contracts: rows.map((r) =>
        r.ok && r.contract
          ? {
              symbol: r.symbol,
              eodhd: r.eodhd,
              venue: r.venue,
              ok: true,
              conId: r.contract.conId,
              exchange: r.contract.exchange,
              primaryExchange: r.contract.primaryExchange,
              currency: r.contract.currency,
              companyName: r.contract.companyName,
              cachedAt: r.contract.cachedAt,
              day: r.contract.day,
            }
          : {
              symbol: r.symbol,
              eodhd: r.eodhd,
              venue: r.venue,
              ok: false,
              expectedPrimaryExchange: r.expectedPrimaryExchange,
              expectedCurrency: r.expectedCurrency,
              error: r.error ?? "sin resolver",
            },
      ),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
