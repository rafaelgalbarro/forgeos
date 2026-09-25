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

export function StrategyRegimeSelector({
  defaultSymbol,
  defaultRegime,
}: {
  defaultSymbol: string;
  defaultRegime: string;
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
      next.set("symbol", symbol);
      next.set("regime", regime);
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
      aria-label="Strategy evaluation regime"
    >
      <label className={styles.filterField}>
        <span>DEMO symbol</span>
        <input
          name="symbol"
          className={styles.filterInput}
          defaultValue={searchParams?.get("symbol") ?? defaultSymbol}
          placeholder="DEMO"
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
      <button type="submit" className={styles.filterBtn} disabled={pending}>
        {pending ? "Evaluating…" : "Re-evaluate (DEMO)"}
      </button>
      <span className={styles.filterHint}>Offline DEMO context · no broker · NOT_READY</span>
    </form>
  );
}
