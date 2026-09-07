import type {
  RegimeFit,
  StrategyMetadata,
  StrategyRegime,
} from "./types";

export function evaluateRegimeFit(
  regime: StrategyRegime,
  metadata: StrategyMetadata,
): RegimeFit {
  if (metadata.incompatibleRegimes.includes(regime)) {
    return "incompatible";
  }
  if (metadata.compatibleRegimes.includes(regime)) {
    return "compatible";
  }
  return "neutral";
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function addHoursIso(iso: string, hours: number): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid ISO timestamp: ${iso}`);
  }
  return new Date(ms + hours * 3_600_000).toISOString();
}

export function mean(values: readonly number[] | undefined): number | undefined {
  if (!values || values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdev(values: readonly number[] | undefined): number | undefined {
  if (!values || values.length < 2) return undefined;
  const m = mean(values)!;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
