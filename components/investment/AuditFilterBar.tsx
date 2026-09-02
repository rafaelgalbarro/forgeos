"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import styles from "@/styles/investment/workspace.module.css";

const KINDS = [
  "ALL",
  "decision",
  "analysis",
  "error",
  "simulated_operation",
  "result",
  "market",
] as const;

export function AuditFilterBar({ symbols }: { symbols: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (form: HTMLFormElement) => {
      const fd = new FormData(form);
      const next = new URLSearchParams();
      const kind = String(fd.get("kind") ?? "ALL");
      const symbol = String(fd.get("symbol") ?? "ALL");
      const analytics = String(fd.get("analytics") ?? "ALL");
      const q = String(fd.get("q") ?? "").trim();
      if (kind && kind !== "ALL") next.set("kind", kind);
      if (symbol && symbol !== "ALL") next.set("symbol", symbol);
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
      aria-label="Audit filters"
    >
      <label className={styles.filterField}>
        <span>Kind</span>
        <select name="kind" className={styles.filterSelect} defaultValue={searchParams?.get("kind") ?? "ALL"}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k === "ALL" ? "All kinds" : k}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Symbol</span>
        <select name="symbol" className={styles.filterSelect} defaultValue={searchParams?.get("symbol") ?? "ALL"}>
          <option value="ALL">All symbols</option>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
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
          placeholder="Summary text…"
        />
      </label>
      <button type="submit" className={styles.filterBtn} disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </button>
    </form>
  );
}
