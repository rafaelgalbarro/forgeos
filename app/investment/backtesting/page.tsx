import { Suspense } from "react";
import { InvestmentRouteShell } from "@/components/investment/InvestmentRouteShell";
import { BacktestRunControls } from "@/components/investment/BacktestRunControls";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import { getStrategyCatalogSnapshot } from "@/lib/investment/strategy-catalog";
import { runStrategyBacktest } from "@/lib/investment/backtest-runner";
import { runWalkForwardBacktest } from "@/lib/investment/walk-forward-backtest";
import { runAdvancedBacktest } from "@/lib/backtesting";
import type { BacktestHorizon, BacktestSignalFamily } from "@/lib/backtesting";
import type { StrategyRegime } from "@/src/core/investment/strategy/domain/types";
import styles from "@/styles/investment/workspace.module.css";

export const metadata = {
  title: "Backtesting",
  description: "Advanced backtesting — Yahoo history, grid search, walk-forward. ANALYSIS_ONLY.",
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

const HORIZONS: readonly BacktestHorizon[] = ["intraday", "swing", "daily5y"];
const FAMILIES: readonly BacktestSignalFamily[] = ["rsi", "macd", "bollinger"];

type Params = {
  symbol?: string;
  regime?: string;
  strategyId?: string;
  mode?: string;
  horizon?: string;
  family?: string;
};

function fmt(n: number | null | undefined, digits = 3): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return `${(n * 100).toFixed(1)}%`;
}

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
  const modeRaw = params?.mode ?? "advanced";
  const mode =
    modeRaw === "walkforward" || modeRaw === "single" ? modeRaw : "advanced";
  const horizonRaw = params?.horizon ?? "swing";
  const horizon = HORIZONS.includes(horizonRaw as BacktestHorizon)
    ? (horizonRaw as BacktestHorizon)
    : "swing";
  const familyRaw = params?.family ?? "rsi";
  const family = FAMILIES.includes(familyRaw as BacktestSignalFamily)
    ? (familyRaw as BacktestSignalFamily)
    : "rsi";

  if (mode === "advanced") {
    const adv = await runAdvancedBacktest({
      symbol,
      horizon,
      family,
      enableGridSearch: true,
      enableWalkForward: true,
    });
    const m = adv.walkForward?.aggregateOos ?? adv.simulation.metrics;
    const curve =
      adv.walkForward && adv.walkForward.equityCurve.length >= 2
        ? adv.walkForward.equityCurve
        : adv.simulation.equityCurve;

    return (
      <>
        <InvestmentRouteShell
          title="Backtesting"
          description="Advanced Yahoo backtest — grid search + walk-forward OOS. Short-term (intraday/swing) emphasis. No IBKR orders."
          moduleLabel="Strategy Lab / Advanced Backtesting"
          metrics={[
            { label: "Bars", value: String(adv.barCount) },
            { label: "Sharpe", value: fmt(m.sharpe) },
            { label: "Data", value: adv.dataLabel },
            { label: "Readiness", value: "NOT_READY" },
          ]}
          panels={[
            {
              title: "Run",
              state: adv.barCount >= 40 ? "READY" : "NO_DATA",
              lines: [
                adv.note,
                `${adv.symbol} · ${adv.horizon} · ${adv.family}`,
                `${adv.interval}/${adv.range}`,
                `Trades: ${m.tradeCount}`,
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
            defaultMode="advanced"
            defaultHorizon={horizon}
            defaultFamily={family}
          />
        </Suspense>

        <div className={styles.grid} style={{ marginTop: 4 }}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {adv.walkForward ? "OOS metrics (walk-forward)" : "Simulation metrics"}
              </h2>
              <span className={styles.monitorWarn}>{adv.dataLabel}</span>
            </div>
            <ul className={styles.panelList}>
              <li>Sharpe: {fmt(m.sharpe)} · Sortino: {fmt(m.sortino)}</li>
              <li>
                Max DD: {fmt(m.maxDrawdownPct, 2)}% · Win rate: {fmtPct(m.winRate)}
              </li>
              <li>
                Profit factor: {fmt(m.profitFactor, 2)} · Trades: {m.tradeCount}
              </li>
              <li>
                Total return: {fmt(m.totalReturnPct, 2)}% · Expectancy: {fmt(m.expectancy, 2)}
              </li>
            </ul>
          </article>

          {adv.gridSearch?.best ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Best grid params</h2>
                <span className={styles.monitorOk}>score {fmt(adv.gridSearch.best.score)}</span>
              </div>
              <ul className={styles.panelList}>
                <li>{JSON.stringify(adv.gridSearch.best.params)}</li>
                <li>
                  IS Sharpe {fmt(adv.gridSearch.best.metrics.sharpe)} · PF{" "}
                  {fmt(adv.gridSearch.best.metrics.profitFactor, 2)}
                </li>
                {(adv.gridSearch.trials.slice(0, 4) ?? []).map((t, i) => (
                  <li key={i}>
                    #{i + 1} score {fmt(t.score)} · Sharpe {fmt(t.metrics.sharpe)}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>

        {curve.length >= 2 ? (
          <div className={styles.grid} style={{ marginTop: 4 }}>
            <EquityCurveChart
              points={curve.map((p) => ({ index: p.index, equity: p.equity }))}
              label={
                adv.walkForward
                  ? "Walk-forward OOS equity (analysis, not broker P&L)"
                  : "Simulated equity curve (analysis, not broker P&L)"
              }
            />
          </div>
        ) : null}

        {adv.walkForward && adv.walkForward.folds.length > 0 ? (
          <div className={styles.grid} style={{ marginTop: 4 }}>
            {adv.walkForward.folds.map((f) => (
              <article key={f.foldIndex} className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Fold {f.foldIndex + 1} · train {f.trainStart}–{f.trainEnd} · test{" "}
                    {f.testStart}–{f.testEnd}
                  </h2>
                  <span className={styles.monitorWarn}>OOS</span>
                </div>
                <ul className={styles.panelList}>
                  <li>Params: {JSON.stringify(f.bestParams)}</li>
                  <li>
                    IS Sharpe {fmt(f.inSample.sharpe)} · OOS Sharpe {fmt(f.outOfSample.sharpe)}
                  </li>
                  <li>
                    OOS DD {fmt(f.outOfSample.maxDrawdownPct, 2)}% · WR{" "}
                    {fmtPct(f.outOfSample.winRate)} · PF{" "}
                    {fmt(f.outOfSample.profitFactor, 2)}
                  </li>
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  const walkForward = mode === "walkforward";
  const run = walkForward
    ? await runWalkForwardBacktest({ symbol, regime, strategyId })
    : await runStrategyBacktest({ symbol, regime, strategyId });

  const isWalk = "windowCount" in run;

  return (
    <>
      <InvestmentRouteShell
        title="Backtesting"
        description="Historical Strategy Engine walk — single run or walk-forward windows. DEMO/MI/Yahoo labels. No IBKR orders."
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
          defaultHorizon={horizon}
          defaultFamily={family}
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
