/**
 * IBKR stock commission estimate and the "cost vs. target" entry gate.
 *
 * Live losses of 23–27/10 (SMCI ×2, INTC) came mostly from commissions on 1-share orders:
 * IBKR fixed USD pricing charges max($1, $0.005/share) capped at 1 % of trade value, so a
 * $33 order pays ~1 % per side; Spanish/EU orders pay ~€2 per side (TEF 44 × €3.22 → €2.07).
 * A round trip above ~1 % of notional eats a third or more of a +6 % target and makes a
 * −2 % stop a −4 % loss. The gate blocks those entries instead of placing them.
 */

export type StockCcy = "USD" | "EUR" | string;

/** One-side commission in the trade currency. */
export function ibkrCommissionPerSide(ccy: StockCcy, shares: number, price: number): number {
  const value = Math.max(0, shares) * Math.max(0, price);
  if (!(value > 0)) return 0;
  if (String(ccy).toUpperCase() === "USD") {
    const perShare = Math.max(1, 0.005 * Math.max(1, shares));
    return Math.min(perShare, 0.01 * value);
  }
  const min = Number(process.env.IBKR_EU_MIN_COMMISSION ?? "2");
  return Math.max(Number.isFinite(min) ? min : 2, 0.0005 * value);
}

/** Round-trip commission as % of the order value. */
export function ibkrRoundTripCostPct(ccy: StockCcy, shares: number, price: number): number {
  const value = Math.max(0, shares) * Math.max(0, price);
  if (!(value > 0)) return Infinity;
  return ((2 * ibkrCommissionPerSide(ccy, shares, price)) / value) * 100;
}

export function maxRoundTripCostPct(): number {
  const v = Number(process.env.IB_MAX_ROUNDTRIP_COST_PCT ?? "1");
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export type CostGate = { ok: boolean; costPct: number; maxPct: number; minValue: number; reason: string };

/**
 * Entry allowed only if the round trip costs ≤ maxPct of notional AND ≤ 1/3 of the target move.
 * `minValue` is the order value at which the trade would pass (for the log).
 */
export function ibkrCostGate(args: { ccy: StockCcy; shares: number; price: number; targetPrice?: number | null }): CostGate {
  const { ccy, shares, price } = args;
  const costPct = ibkrRoundTripCostPct(ccy, shares, price);
  const targetPct = args.targetPrice && args.targetPrice > price && price > 0 ? ((args.targetPrice - price) / price) * 100 : null;
  const maxPct = Math.min(maxRoundTripCostPct(), targetPct != null ? targetPct / 3 : Infinity);
  const minSide = String(ccy).toUpperCase() === "USD" ? 1 : Number(process.env.IBKR_EU_MIN_COMMISSION ?? "2") || 2;
  const minValue = maxPct > 0 && Number.isFinite(maxPct) ? (2 * minSide * 100) / maxPct : Infinity;
  const ok = costPct <= maxPct + 1e-9;
  return {
    ok,
    costPct,
    maxPct,
    minValue,
    reason: ok
      ? `comisiones ida+vuelta ${costPct.toFixed(2)}% ≤ ${maxPct.toFixed(2)}%`
      : `comisiones ida+vuelta ${costPct.toFixed(2)}% > ${maxPct.toFixed(2)}% del importe (orden ${(shares * price).toFixed(2)} ${ccy}; haría falta ≥ ${minValue.toFixed(0)} ${ccy})`,
  };
}
