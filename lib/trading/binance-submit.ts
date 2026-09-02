/**
 * Binance spot order submit — direct REST (crypto 24h).
 */

import "server-only";

import { submitBinanceLimitOrder } from "@/lib/market-data/binance-rest";
import { isBinanceConfigured, isBinanceCryptoTicker } from "@/lib/market-data/binance-config";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";

export type BinanceSubmitResult = {
  orderId: string;
  symbol: string;
  status: string;
};

export async function submitBinanceLiveLimitOrder(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly limitPrice: number;
  readonly rationale?: string;
}): Promise<BinanceSubmitResult> {
  const symbol = String(args.symbol).toUpperCase();
  if (!isBinanceCryptoTicker(symbol)) {
    throw new Error(`${symbol} is not a Binance crypto ticker`);
  }
  const flags = getInvestmentRuntimeFlags();
  if (!flags.liveTradingEnabled || flags.ibkrReadOnly) {
    throw new Error(
      `Binance submit blocked — LIVE_TRADING_ENABLED=${String(flags.liveTradingEnabled)} IBKR_READ_ONLY=${String(flags.ibkrReadOnly)}`,
    );
  }
  if (!isBinanceConfigured()) {
    throw new Error("BINANCE_API_KEY / BINANCE_SECRET not configured");
  }

  console.log(
    `[BinanceExecute] ${symbol} ${args.side} qty=${args.quantity} LMT=$${args.limitPrice.toFixed(4)} ` +
      `(rationale=${(args.rationale ?? "").slice(0, 80)})`,
  );

  const result = await submitBinanceLimitOrder({
    ticker: symbol,
    side: args.side,
    quantity: args.quantity,
    limitPrice: args.limitPrice,
  });

  console.log(`[BinanceExecute] ${symbol} → orderId=${result.orderId} status=${result.status} ✅`);
  return {
    orderId: result.orderId,
    symbol: result.symbol,
    status: result.status,
  };
}
