/**
 * IBKR US stock proposal fields for fractional / cashQty transmit (official TWS API >= 163).
 * EUR locals stay whole-share only.
 */

export type IbkrStockProposalOrderFields = {
  quantity: number;
  fractional?: boolean;
  cash_qty_usd?: number;
};

export function buildIbkrStockProposalOrderFields(args: {
  side: "BUY" | "SELL";
  quantity: number;
  limitPrice: number;
  currency?: "USD" | "EUR";
  fractional?: boolean;
  /** Deployable notional from resolvePositionSize (USD). */
  cashQtyUsd?: number;
}): IbkrStockProposalOrderFields {
  const currency = args.currency ?? "USD";
  const qty = Number(args.quantity);
  const limit = Number(args.limitPrice);

  if (!(qty > 0) || !(limit > 0)) {
    throw new Error(`invalid stock order qty=${qty} limit=${limit}`);
  }

  if (currency === "EUR") {
    return { quantity: Math.max(1, Math.floor(qty)) };
  }

  if (args.side === "SELL" && qty < 1) {
    return { quantity: qty, fractional: true };
  }

  if (!args.fractional) {
    return { quantity: Math.max(1, Math.floor(qty)) };
  }

  const notional =
    args.cashQtyUsd != null && args.cashQtyUsd > 0
      ? args.cashQtyUsd
      : qty * limit;
  if (notional < 25) {
    throw new Error(`fractional minimum $25 — notional $${notional.toFixed(2)}`);
  }
  if (qty >= 1 && Math.abs(qty - Math.round(qty)) < 1e-9) {
    return { quantity: Math.floor(qty) };
  }

  return {
    quantity: qty,
    fractional: true,
    cash_qty_usd: Math.round(notional * 100) / 100,
  };
}
