import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { StrategiesLaboratoryDashboard } from "@/components/investment/StrategiesLaboratoryDashboard";
import { StrategyRegimeSelector } from "@/components/investment/StrategyRegimeSelector";
import { getStrategyCenterSnapshot } from "@/lib/investment/strategy-catalog";
import { evaluateStrategiesOffline } from "@/lib/investment/strategy-evaluation";
import { getStrategyLabSnapshot } from "@/lib/investment/strategy-lab-snapshot";
import type { StrategyRegime } from "@/src/core/investment/strategy/domain/types";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Strategies Laboratory",
  description:
    "ForgeOS Investment Strategies Laboratory — catálogo, métricas históricas IBKR/paper, compare y ranking. ANALYSIS_ONLY, AUTONOMOUS_LIVE LOCKED.",
};

export const dynamic = "force-dynamic";

const REGIMES: readonly StrategyRegime[] = [
  "bullish",
  "bearish",
  "sideways",
  "transition",
  "high-volatility",
  "low-volatility",
  "risk-on",
  "risk-off",
];

type Params = { symbol?: string; regime?: string; focus?: string; compare?: string };

export default async function InvestmentStrategiesPage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const symbol = (params?.symbol ?? "DEMO").trim() || "DEMO";
  const regimeRaw = params?.regime ?? "bullish";
  const regime = REGIMES.includes(regimeRaw as StrategyRegime)
    ? (regimeRaw as StrategyRegime)
    : "bullish";

  const catalog = getStrategyCenterSnapshot();
  const evaluation = evaluateStrategiesOffline({ symbol, regime });
  const lab = await getStrategyLabSnapshot({
    focusStrategyId: params?.focus,
    compareWithStrategyId: params?.compare,
    persistMemory: true,
  });

  return (
    <>
      <InvestmentRouteShell
        title="Strategies Laboratory"
        description="Professional strategy lab/center — activate, compare historical IBKR/paper metrics, rank, and link into backtest / paper / shadow. No broker. Readiness NOT_READY."
        moduleLabel="Strategies"
        metrics={[
          { label: "Strategies", value: String(catalog.count) },
          { label: "Enabled", value: String(catalog.enabledCount) },
          { label: "Data", value: lab.tradeDataLabel },
          { label: "Readiness", value: catalog.strategyReadiness },
          { label: "Go-live", value: catalog.goLive },
        ]}
        panels={[
          {
            title: "Laboratory",
            state: "READY",
            lines: [
              catalog.note,
              `Enabled ${catalog.enabledCount}/${catalog.count}`,
              `Lab top: ${lab.ranking[0]?.name ?? "NO_DATA"}`,
              `Trade data: ${lab.tradeDataLabel}`,
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "AUTONOMOUS_LIVE LOCKED",
              "LIVE_TRADING_ENABLED false",
              "No order submission from Strategies",
              "AI proposals never auto-modify production",
            ],
          },
        ]}
        links={[
          { href: "/investment/strategy-lab", label: "Strategy Lab (deep) →" },
          { href: "/investment/backtesting", label: "Backtesting →" },
          { href: "/investment/paper", label: "Paper Trading →" },
          { href: "/investment/shadow", label: "Shadow Trading →" },
          { href: "/investment/backtesting?mode=walkforward", label: "Walk-forward →" },
          { href: "/investment/live", label: "Live (LOCKED) →" },
        ]}
      />

      <Suspense fallback={<p className={styles.hubNote}>Loading regime selector…</p>}>
        <StrategyRegimeSelector defaultSymbol={symbol} defaultRegime={regime} />
      </Suspense>

      <StrategiesLaboratoryDashboard
        lab={lab}
        centerRows={catalog.strategies}
        enabledCount={catalog.enabledCount}
        count={catalog.count}
        evaluationRows={evaluation.rows}
        dataLabel={lab.tradeDataLabel}
      />
    </>
  );
}
