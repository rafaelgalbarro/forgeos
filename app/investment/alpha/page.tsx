import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { AlphaEngineDashboard } from "@/components/investment/AlphaEngineDashboard";
import { getAlphaEngineSnapshot } from "@/lib/investment/alpha-engine-snapshot";
import type { AlphaEngineFilters, AlphaMarket } from "@/src/core/investment/alpha-engine";

export const metadata = {
  title: "Alpha Engine",
  description:
    "Alpha Engine — discover, score, prioritize opportunities. ANALYSIS_ONLY. No order submission.",
};

export const dynamic = "force-dynamic";

type Params = {
  market?: string;
  asset?: string;
  strategy?: string;
  minConfidence?: string;
  maxRiskPct?: string;
  horizon?: string;
  grade?: string;
};

export default async function InvestmentAlphaEnginePage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const filters: AlphaEngineFilters = {
    market: (params?.market as AlphaMarket | "all" | undefined) ?? undefined,
    asset: params?.asset,
    strategy: params?.strategy,
    minConfidence: params?.minConfidence ? Number(params.minConfidence) : undefined,
    maxRiskPct: params?.maxRiskPct ? Number(params.maxRiskPct) : undefined,
    timeHorizon: params?.horizon,
    grade: params?.grade,
  };

  const snapshot = await getAlphaEngineSnapshot({
    filters,
    persistMemory: true,
  });

  return (
    <>
      <InvestmentRouteShell
        title="Alpha Engine"
        description="Central opportunity discovery and scoring. Only A+/A escalate to Committee and Risk (analysis). Never places orders."
        moduleLabel="Alpha Engine"
        metrics={[
          { label: "Top A+/A", value: String(snapshot.topOpportunities.length) },
          { label: "Rejected", value: String(snapshot.rejectedOpportunities.length) },
          { label: "Ranked", value: String(snapshot.alphaRanking.length) },
          { label: "Orders", value: String(snapshot.ordersSubmitted) },
        ]}
        panels={[
          {
            title: "Pipeline",
            state: "READY",
            lines: [
              snapshot.note,
              `Committee queue: ${snapshot.committeeEscalations.length}`,
              `Risk queue: ${snapshot.riskEscalations.length}`,
              `Strategy Lab: ${snapshot.integrations.strategyLab}`,
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "LIVE_TRADING_ENABLED false",
              "IBKR_READ_ONLY true",
              "ordersSubmitted=0",
              "Broker Adapter unchanged",
            ],
          },
        ]}
        links={[
          { href: "/investment/strategy-lab", label: "Strategy Lab →" },
          { href: "/investment/ai-committee", label: "AI Committee →" },
          { href: "/investment/risk", label: "Risk →" },
          { href: "/investment/scanner", label: "Market Scanner →" },
          { href: "/investment/opportunities", label: "Opportunities →" },
        ]}
      />
      <AlphaEngineDashboard initial={snapshot} />
    </>
  );
}
