/**
 * Position sizing for FX (pure).
 * Units such that a stop-out loses `riskPct` % of NAV in account currency,
 * capped by notional ≤ maxLeverage × NAV.
 */

export type FxRates = Record<string, number>; // "EUR_USD" → mid

function ccys(instrument: string): { base: string; quote: string } {
  const [base, quote] = instrument.toUpperCase().split("_");
  return { base: base ?? "", quote: quote ?? "" };
}

/** Value of 1 unit of `from` currency expressed in `to` currency. */
export function convert(from: string, to: string, rates: FxRates): number | null {
  if (from === to) return 1;
  const direct = rates[`${from}_${to}`];
  if (direct && direct > 0) return direct;
  const inverse = rates[`${to}_${from}`];
  if (inverse && inverse > 0) return 1 / inverse;
  // Cross via USD.
  const a = from === "USD" ? 1 : rates[`${from}_USD`] ?? (rates[`USD_${from}`] ? 1 / rates[`USD_${from}`]! : null);
  const b = to === "USD" ? 1 : rates[`USD_${to}`] ?? (rates[`${to}_USD`] ? 1 / rates[`${to}_USD`]! : null);
  return a != null && b != null ? a * b : null;
}

export type FxSizing =
  | { ok: true; units: number; riskAccount: number; notionalAccount: number; leverage: number }
  | { ok: false; reason: string };

export function sizeFxPosition(args: {
  instrument: string;
  accountCurrency: string;
  nav: number;
  riskPct: number;
  stopDistance: number;
  price: number;
  rates: FxRates;
  maxLeverage: number;
  /** OANDA: quoteHomeConversionFactor if known (quote → account). */
  quoteToAccount?: number | null;
}): FxSizing {
  const { base, quote } = ccys(args.instrument);
  if (!(args.nav > 0)) return { ok: false, reason: "NAV 0" };
  if (!(args.stopDistance > 0)) return { ok: false, reason: "stop 0" };
  const q2a = args.quoteToAccount ?? convert(quote, args.accountCurrency, args.rates);
  const b2a = convert(base, args.accountCurrency, args.rates);
  if (!q2a || !b2a) return { ok: false, reason: `sin tipo de cambio ${quote}/${base}→${args.accountCurrency}` };
  const riskAccount = (args.nav * args.riskPct) / 100;
  // Loss per unit at the stop, in account currency.
  const lossPerUnit = args.stopDistance * q2a;
  let units = Math.floor(riskAccount / lossPerUnit);
  const maxUnitsByLeverage = Math.floor((args.nav * args.maxLeverage) / b2a);
  if (units > maxUnitsByLeverage) units = maxUnitsByLeverage;
  if (units < 1) return { ok: false, reason: "tamaño < 1 unidad" };
  const notionalAccount = units * b2a;
  return {
    ok: true,
    units,
    riskAccount: units * lossPerUnit,
    notionalAccount,
    leverage: notionalAccount / args.nav,
  };
}

/** P&L in account currency for a closed trade. */
export function fxPnlAccount(args: {
  instrument: string;
  side: "long" | "short";
  units: number;
  entry: number;
  exit: number;
  accountCurrency: string;
  rates: FxRates;
}): number {
  const { quote } = ccys(args.instrument);
  const q2a = convert(quote, args.accountCurrency, args.rates) ?? 0;
  const move = args.side === "long" ? args.exit - args.entry : args.entry - args.exit;
  return move * args.units * q2a;
}

export type FxLotSizing =
  | { ok: true; lots: number; riskAccount: number; notionalAccount: number; leverage: number }
  | { ok: false; reason: string };

/**
 * MT5 sizing in lots using the broker's own tick value (account currency per tick per lot),
 * rounded down to volume_step, capped by notional ≤ maxLeverage × NAV.
 */
export function sizeFxLots(args: {
  nav: number;
  riskPct: number;
  stopDistance: number;
  tickSize: number;
  tickValueLoss: number;
  contractSize: number;
  volumeMin: number;
  volumeStep: number;
  volumeMax: number;
  baseToAccount: number | null;
  maxLeverage: number;
}): FxLotSizing {
  if (!(args.nav > 0)) return { ok: false, reason: "NAV 0" };
  if (!(args.stopDistance > 0) || !(args.tickSize > 0) || !(args.tickValueLoss > 0)) {
    return { ok: false, reason: "datos de tick incompletos" };
  }
  const riskAccount = (args.nav * args.riskPct) / 100;
  const lossPerLot = (args.stopDistance / args.tickSize) * args.tickValueLoss;
  let lots = riskAccount / lossPerLot;
  if (args.baseToAccount && args.baseToAccount > 0 && args.contractSize > 0) {
    const maxLots = (args.nav * args.maxLeverage) / (args.contractSize * args.baseToAccount);
    lots = Math.min(lots, maxLots);
  }
  lots = Math.min(lots, args.volumeMax || lots);
  const step = args.volumeStep > 0 ? args.volumeStep : 0.01;
  lots = Math.floor(lots / step + 1e-9) * step;
  const decimals = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  lots = Number(lots.toFixed(decimals));
  if (lots < args.volumeMin) {
    const minRisk = args.volumeMin * lossPerLot;
    return { ok: false, reason: `lote mínimo ${args.volumeMin} arriesga ${minRisk.toFixed(2)} > ${riskAccount.toFixed(2)}` };
  }
  const notionalAccount = lots * args.contractSize * (args.baseToAccount ?? 1);
  return { ok: true, lots, riskAccount: lots * lossPerLot, notionalAccount, leverage: notionalAccount / args.nav };
}
