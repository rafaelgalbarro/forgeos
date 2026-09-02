import type { MarketSnapshot } from "@/src/core/investment/market-intelligence/domain/types";

/**
 * Inspect MI snapshots for optional asset-class / liquidity fields.
 * Never invents values — only reports what providers already returned.
 */
export type ScreenerFieldAvailability = {
  readonly assetClassExposed: boolean;
  readonly assetClasses: readonly string[];
  readonly liquidityExposed: boolean;
  /** Symbols that have last time-series volume (MI-exposed liquidity proxy). */
  readonly symbolsWithVolume: readonly string[];
  readonly note: string;
};

function lastVolume(snapshot: MarketSnapshot): number | null {
  const points = snapshot.timeSeries?.points;
  if (!points?.length) return null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const v = points[i]?.volume;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/** Optional field — only when MI provider returned assetClass. Never invent. */
function readAssetClass(snapshot: MarketSnapshot): string | null {
  if (typeof snapshot.assetClass === "string" && snapshot.assetClass.trim()) {
    return snapshot.assetClass.trim();
  }
  return null;
}

export function inspectScreenerFieldAvailability(
  snapshots: readonly MarketSnapshot[],
): ScreenerFieldAvailability {
  const classes = new Set<string>();
  const withVolume: string[] = [];
  for (const s of snapshots) {
    const ac = readAssetClass(s);
    if (ac) classes.add(ac);
    if (lastVolume(s) != null) withVolume.push(s.symbol);
  }

  const assetClassExposed = classes.size > 0;
  const liquidityExposed = withVolume.length > 0;

  return {
    assetClassExposed,
    assetClasses: [...classes].sort(),
    liquidityExposed,
    symbolsWithVolume: [...new Set(withVolume)].sort(),
    note: assetClassExposed || liquidityExposed
      ? "Optional MI fields present on some snapshots."
      : "NO_DATA — MI snapshots do not expose assetClass or timeSeries volume yet. Filters disabled (not invented).",
  };
}

export function snapshotAssetClass(snapshot: MarketSnapshot): string | null {
  return readAssetClass(snapshot);
}

export function snapshotLastVolume(snapshot: MarketSnapshot): number | null {
  return lastVolume(snapshot);
}
