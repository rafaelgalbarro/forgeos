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
  defaultMode = "single",
}: {
  strategies: ReadonlyArray<{ strategyId: string; name: string }>;
  defaultSymbol: string;
  defaultRegime: string;
  defaultStrategyId: string;
  defaultMode?: "single" | "walkforward";
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
      const mode = String(fd.get("mode") ?? "single");
      next.set("symbol", symbol);
      next.set("regime", regime);
      if (strategyId && strategyId !== "ALL") next.set("strategyId", strategyId);
      if (mode === "walkforward") next.set("mode", "walkforward");
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [pathname, router],
  );

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
      <label className={styles.filterField}>
        <span>Report</span>
        <select
          name="mode"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("mode") ?? defaultMode}
        >
          <option value="single">Single run</option>
          <option value="walkforward">Walk-forward</option>
        </select>
      </label>
      <button type="submit" className={styles.filterBtn} disabled={pending}>
        {pending ? "Running…" : "Run backtest"}
      </button>
      <span className={styles.filterHint}>ANALYSIS_ONLY · DEMO/MI · no orders</span>
    </form>
  );
}
