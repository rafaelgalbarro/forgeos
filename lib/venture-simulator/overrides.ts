import type { SimulatorAssumptions, VentureSimulatorOverrides } from "./types";

export function hasActiveOverrides(overrides?: VentureSimulatorOverrides | null): boolean {
  if (!overrides) return false;
  return (
    overrides.monthlyPrice != null ||
    overrides.estimatedCAC != null ||
    overrides.monthlyChurnPercent != null ||
    overrides.monthlyBurn != null ||
    overrides.commissionPercent != null ||
    overrides.estimatedConversion != null
  );
}

const OVERRIDE_KEYS: (keyof VentureSimulatorOverrides)[] = [
  "monthlyPrice",
  "estimatedCAC",
  "monthlyChurnPercent",
  "monthlyBurn",
  "commissionPercent",
  "estimatedConversion",
];

export function overridesMatch(
  a: VentureSimulatorOverrides,
  b?: VentureSimulatorOverrides | null
): boolean {
  return OVERRIDE_KEYS.every((key) => (a[key] ?? undefined) === (b?.[key] ?? undefined));
}

export function applySimulatorOverrides(
  base: SimulatorAssumptions,
  overrides?: VentureSimulatorOverrides | null
): SimulatorAssumptions {
  if (!hasActiveOverrides(overrides)) return base;

  const next = { ...base };

  if (overrides!.estimatedCAC != null) {
    next.baseCAC = Math.max(1, overrides!.estimatedCAC);
  }
  if (overrides!.monthlyChurnPercent != null) {
    next.baseChurnMonthly = Math.max(0.1, overrides!.monthlyChurnPercent);
  }
  if (overrides!.estimatedConversion != null) {
    next.baseConversion = Math.max(0.1, overrides!.estimatedConversion);
  }
  if (overrides!.monthlyBurn != null) {
    next.monthlyBurnEstimate = Math.max(0, overrides!.monthlyBurn);
  }
  if (overrides!.monthlyPrice != null) {
    const monthly = Math.max(0, overrides!.monthlyPrice);
    next.revenuePerUserYear1 = Math.round(monthly * 12);
    next.revenuePerUserYear2 = Math.round(next.revenuePerUserYear1 * 1.35);
  }
  if (overrides!.commissionPercent != null && !overrides!.monthlyPrice) {
    const rate = Math.max(0.1, Math.min(50, overrides!.commissionPercent)) / 100;
    const impliedGmv = next.revenuePerUserYear1 / 0.12;
    next.revenuePerUserYear1 = Math.round(impliedGmv * rate);
    next.revenuePerUserYear2 = Math.round(next.revenuePerUserYear1 * 1.35);
  }

  return next;
}
