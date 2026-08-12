import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { BacktestRunControls } from "@/components/investment/BacktestRunControls";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import { getStrategyCatalogSnapshot } from "@/lib/investment/strategy-catalog";
import { runStrategyBacktest } from "@/lib/investment/backtest-runner";
import { runWalkForwardBacktest } from "@/lib/investment/walk-forward-backtest";
import type { StrategyRegime } from "@/src/core/investment/strategy/domain/types";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Backtesting",
  description: "Backtesting on Strategy Engine — ANALYSIS_ONLY.",
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

type Params = { symbol?: string; regime?: string; strategyId?: string; mode?: string };

export default async function InvestmentBacktestingPage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const catalog = getStrategyCatalogSnapshot();
  const symbol = (params?.symbol ?? "DEMO").trim() || "DEMO";
  const regimeRaw = params?.regime ?? "bullish";
  const regime = REGIMES.includes(regimeRaw as StrategyRegime)
    ? (regimeRaw as StrategyRegime)
    : "bullish";
  const strategyId = params?.strategyId?.trim() || "ALL";
  const walkForward = params?.mode === "walkforward";

  const run = walkForward
    ? await runWalkForwardBacktest({ symbol, regime, strategyId })
    : await runStrategyBacktest({ symbol, regime, strategyId });

  const isWalk = "windowCount" in run;

  return (
    <>
      <InvestmentRouteShell
        title="Backtesting"
        description="Historical Strategy Engine walk — single run or walk-forward windows. DEMO/MI labels. No IBKR orders."
        moduleLabel="Strategy Engine / Backtesting"
        metrics={[
          {
            label: isWalk ? "Windows" : "Strategies",
            value: isWalk ? String(run.windowCount) : String(run.results.length),
          },
          {
            label: isWalk ? "Entries" : "Bars",
            value: isWalk
              ? String(run.aggregate.totalEntrySignals)
              : String(run.barCount),
          },
          { label: "Data", value: run.dataLabel },
          { label: "Readiness", value: "NOT_READY" },
        ]}
        panels={[
          {
            title: isWalk ? "Walk-forward" : "Run",
            state: (isWalk ? run.windowCount : run.results.length) ? "READY" : "NO_DATA",
            lines: [
              run.note,
              `Symbol ${run.symbol} · regime ${run.regime}`,
              `Filter: ${run.strategyId}`,
              isWalk
                ? `window=${run.windowSize} step=${run.stepSize}`
                : `Bars: ${run.barCount}`,
            ],
          },
          {
            title: "Safety",
            state: "LOCKED",
            lines: [
              "ANALYSIS_ONLY",
              "Backtests never transmit to broker",
              "AUTONOMOUS_LIVE LOCKED",
              "LIVE_TRADING_ENABLED=false",
            ],
          },
        ]}
        links={[
          { href: "/investment/strategies", label: "Strategies Laboratory →" },
          { href: "/investment/performance", label: "Performance →" },
          { href: "/investment/paper", label: "Paper Trading →" },
        ]}
      />

      <Suspense fallback={<p className={styles.hubNote}>Loading controls…</p>}>
        <BacktestRunControls
          strategies={catalog.strategies.map((s) => ({
            strategyId: s.strategyId,
            name: s.name,
          }))}
          defaultSymbol={symbol}
          defaultRegime={regime}
          defaultStrategyId={strategyId}
          defaultMode={walkForward ? "walkforward" : "single"}
        />
      </Suspense>

      {isWalk && run.equityCurve.length >= 2 ? (
        <div className={styles.grid} style={{ marginTop: 4 }}>
          <EquityCurveChart
            points={run.equityCurve}
            label="Walk-forward score curve (analysis, not broker P&L)"
          />
        </div>
      ) : null}

      <div className={styles.grid} style={{ marginTop: 4 }}>
        {isWalk ? (
          run.windowCount === 0 ? (
            <article className={styles.panel}>
              <ul className={styles.panelList}>
                <li>NO_DATA — {run.note}</li>
              </ul>
            </article>
          ) : (
            run.windows.map((w) => (
              <article key={w.windowIndex} className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Window {w.windowIndex + 1} · bars {w.startBar}–{w.endBar}
                  </h2>
                  <span className={styles.monitorWarn}>{w.dataLabel}</span>
                </div>
                <ul className={styles.panelList}>
                  {w.results.slice(0, 6).map((r) => (
                    <li key={r.strategyId}>
                      {r.name}: entries={r.entrySignals} avg=
                      {r.avgScore == null ? "NO_DATA" : r.avgScore.toFixed(3)} bias={r.lastBias}
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )
        ) : run.results.length === 0 ? (
          <article className={styles.panel}>
            <ul className={styles.panelList}>
              <li>NO_DATA — no matching strategies</li>
            </ul>
          </article>
        ) : (
          run.results.map((row) => (
            <article key={row.strategyId} className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{row.name}</h2>
                <span className={styles.monitorWarn}>{run.dataLabel}</span>
              </div>
              <ul className={styles.panelList}>
                <li>ID: {row.strategyId}</li>
                <li>
                  Bars: {row.bars} · Entry intents: {row.entrySignals} (not sent)
                </li>
                <li>
                  Avg score: {row.avgScore == null ? "NO_DATA" : row.avgScore.toFixed(3)} · Last
                  bias: {row.lastBias}
                </li>
                {row.path.slice(-5).map((b) => (
                  <li key={b.index}>
                    t{b.index} @ {b.price.toFixed(2)} · {b.bias}
                    {b.hasEntryIntent ? " · entry intent" : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </>
  );
}
