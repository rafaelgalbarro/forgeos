"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import styles from "@/styles/investment/workspace.module.css";

const REGIMES = [
  "bullish",
  "bearish",
  "sideways",
  "transition",
  "high-volatility",
  "low-volatility",
  "risk-on",
  "risk-off",
] as const;

export function BacktestRunControls({
  strategies,
  defaultSymbol,
  defaultRegime,
  defaultStrategyId,
  defaultMode = "advanced",
  defaultHorizon = "swing",
  defaultFamily = "rsi",
}: {
  strategies: ReadonlyArray<{ strategyId: string; name: string }>;
  defaultSymbol: string;
  defaultRegime: string;
  defaultStrategyId: string;
  defaultMode?: "single" | "walkforward" | "advanced";
  defaultHorizon?: "intraday" | "swing" | "daily5y";
  defaultFamily?: "rsi" | "macd" | "bollinger";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (form: HTMLFormElement) => {
      const fd = new FormData(form);
      const next = new URLSearchParams();
      const symbol = String(fd.get("symbol") ?? "DEMO").trim() || "DEMO";
      const regime = String(fd.get("regime") ?? "bullish");
      const strategyId = String(fd.get("strategyId") ?? "ALL");
      const mode = String(fd.get("mode") ?? "advanced");
      const horizon = String(fd.get("horizon") ?? "swing");
      const family = String(fd.get("family") ?? "rsi");
      next.set("symbol", symbol);
      next.set("regime", regime);
      if (strategyId && strategyId !== "ALL") next.set("strategyId", strategyId);
      if (mode === "walkforward") next.set("mode", "walkforward");
      else if (mode === "single") next.set("mode", "single");
      else next.set("mode", "advanced");
      next.set("horizon", horizon);
      next.set("family", family);
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [pathname, router],
  );

  const mode = searchParams?.get("mode") ?? defaultMode;

  return (
    <form
      className={styles.filterBar}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      aria-label="Backtest run controls"
    >
      <label className={styles.filterField}>
        <span>Symbol</span>
        <input
          name="symbol"
          className={styles.filterInput}
          defaultValue={searchParams?.get("symbol") ?? defaultSymbol}
          placeholder="DEMO or AAPL"
        />
      </label>
      <label className={styles.filterField}>
        <span>Report</span>
        <select
          name="mode"
          className={styles.filterSelect}
          defaultValue={mode}
        >
          <option value="advanced">Advanced (Yahoo + metrics)</option>
          <option value="single">Strategy Engine single</option>
          <option value="walkforward">Engine walk-forward</option>
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Horizon</span>
        <select
          name="horizon"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("horizon") ?? defaultHorizon}
        >
          <option value="intraday">Intraday (5m)</option>
          <option value="swing">Swing (1–10d)</option>
          <option value="daily5y">Daily ~5y</option>
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Family</span>
        <select
          name="family"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("family") ?? defaultFamily}
        >
          <option value="rsi">RSI</option>
          <option value="macd">MACD</option>
          <option value="bollinger">Bollinger</option>
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Regime</span>
        <select
          name="regime"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("regime") ?? defaultRegime}
        >
          {REGIMES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Strategy</span>
        <select
          name="strategyId"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("strategyId") ?? defaultStrategyId}
        >
          <option value="ALL">All strategies</option>
          {strategies.map((s) => (
            <option key={s.strategyId} value={s.strategyId}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={styles.filterBtn} disabled={pending}>
        {pending ? "Running…" : "Run backtest"}
      </button>
      <span className={styles.filterHint}>ANALYSIS_ONLY · Yahoo/DEMO · no orders</span>
    </form>
  );
}
