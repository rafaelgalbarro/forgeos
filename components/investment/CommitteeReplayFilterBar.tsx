"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import styles from "@/styles/investment/workspace.module.css";

/**
 * URL-driven filters for committee decision replay (portfolio analytics / risk / symbol).
 */
export function CommitteeReplayFilterBar({
  symbols,
  riskLevels,
}: {
  symbols: readonly string[];
  riskLevels: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (form: HTMLFormElement) => {
      const fd = new FormData(form);
      const next = new URLSearchParams();
      const symbol = String(fd.get("symbol") ?? "ALL");
      const risk = String(fd.get("risk") ?? "ALL");
      const analytics = String(fd.get("analytics") ?? "ALL");
      const q = String(fd.get("q") ?? "").trim();
      if (symbol && symbol !== "ALL") next.set("symbol", symbol);
      if (risk && risk !== "ALL") next.set("risk", risk);
      if (analytics && analytics !== "ALL") next.set("analytics", analytics);
      if (q) next.set("q", q);
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
      aria-label="Committee replay filters"
    >
      <label className={styles.filterField}>
        <span>Symbol</span>
        <select
          name="symbol"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("symbol") ?? "ALL"}
        >
          <option value="ALL">All symbols</option>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Risk</span>
        <select
          name="risk"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("risk") ?? "ALL"}
        >
          <option value="ALL">All risk</option>
          {riskLevels.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Portfolio analytics</span>
        <select
          name="analytics"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("analytics") ?? "ALL"}
        >
          <option value="ALL">Any</option>
          <option value="present">Has analytics</option>
          <option value="absent">Missing analytics</option>
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Search</span>
        <input
          name="q"
          className={styles.filterInput}
          defaultValue={searchParams?.get("q") ?? ""}
          placeholder="Recommendation / notes…"
        />
      </label>
      <button type="submit" className={styles.filterBtn} disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </button>
      <span className={styles.filterHint}>ANALYSIS_ONLY · memory replay</span>
    </form>
  );
}
