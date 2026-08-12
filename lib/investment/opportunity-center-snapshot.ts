import "server-only";

import { scanEnhancedOpportunities } from "@/lib/market-data/enhanced-opportunity-scan";
import { getMultiScannerSnapshot } from "@/lib/market-data/market-scanner";
import { getAlphaEngineSnapshot } from "@/lib/investment/alpha-engine-snapshot";
import { getInstitutionalOpportunityRuntime } from "@/lib/investment/opportunity-runtime";
import {
  buildOpportunityCenterFromAlpha,
  OPPORTUNITY_CENTER_FIELD_WIRING,
  OPPORTUNITY_CENTER_SORT_OPTIONS,
  OPPORTUNITY_QUALITY_FILTER,
  type OpportunityCenterSnapshot,
} from "@/lib/investment/opportunity-center";
import type { EnhancedOpportunity } from "@/lib/market-data/types";

/**
 * Builds Opportunity Center payload: scanner scan + Alpha A+/A filter + enhanced multi-source scan.
 * ANALYSIS_ONLY — never places orders; memory persist off for polling.
 */
export async function getOpportunityCenterSnapshot(): Promise<OpportunityCenterSnapshot & {
  enhancedScan?: {
    scannedAt: string;
    opportunities: EnhancedOpportunity[];
    scanDurationMs: number;
    multiPhase?: {
      universeSize: number;
      phase1Count: number;
      phase2Count: number;
      phase3Count: number;
    };
  };
}> {
  const runtime = getInstitutionalOpportunityRuntime();
  const multiScanner = getMultiScannerSnapshot();

  const [scan, alpha, legacyEnhanced] = await Promise.all([
    runtime.scanner.scan(),
    getAlphaEngineSnapshot({ persistMemory: false }),
    scanEnhancedOpportunities().catch((err) => {
      console.warn("[OpportunityCenter] enhanced scan failed:", err);
      return { scannedAt: new Date().toISOString(), opportunities: [] as EnhancedOpportunity[], scanDurationMs: 0 };
    }),
  ]);

  const multiOpps = multiScanner?.opportunities ?? [];
  const mergedOpportunities: EnhancedOpportunity[] = [
    ...multiOpps,
    ...legacyEnhanced.opportunities.filter(
      (leg) => !multiOpps.some((m) => m.ticker === leg.ticker),
    ),
  ].sort((a, b) => b.score - a.score);

  const enhancedScan = {
    scannedAt: multiScanner?.scannedAt ?? legacyEnhanced.scannedAt,
    opportunities: mergedOpportunities,
    scanDurationMs: (multiScanner?.scanDurationMs ?? 0) + legacyEnhanced.scanDurationMs,
    ...(multiScanner
      ? {
          multiPhase: {
            universeSize: multiScanner.universeSize,
            phase1Count: multiScanner.phase1Count,
            phase2Count: multiScanner.phase2Count,
            phase3Count: multiScanner.phase3Count,
          },
        }
      : {}),
  };

  const opportunities = buildOpportunityCenterFromAlpha(alpha.topOpportunities, scan);
  const syntheticScanner = scan.candidates.some(
    (candidate) => candidate.priceQuality === "DEMO",
  );

  return {
    scannedAt: scan.scannedAt,
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    opportunities,
    count: opportunities.length,
    candidates: scan.candidates,
    skippedAssetClasses: scan.skippedAssetClasses,
    scanDurationMs: scan.scanDurationMs,
    qualityFilter: OPPORTUNITY_QUALITY_FILTER,
    sortOptions: OPPORTUNITY_CENTER_SORT_OPTIONS,
    fieldWiring: OPPORTUNITY_CENTER_FIELD_WIRING,
    enhancedScan,
    badges: [
      "ANALYSIS_ONLY",
      "no-orders",
      "no-broker",
      "A+/A-only",
      "multi-source",
      multiOpps.length > 0 ? "multi-ia-scanner" : null,
      mergedOpportunities.some((o) => (o.badges?.length ?? 0) > 0) ? "institutional-scanner" : null,
      syntheticScanner ? "DEMO_SYNTHETIC" : "UNAVAILABLE",
    ].filter(Boolean) as string[],
    note:
      "Opportunity Center — Alpha A+/A + multi-IA scanner (Groq Fase 2, Claude Haiku Fase 3). ANALYSIS_ONLY; never sends orders.",
  };
}
