"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import styles from "@/styles/investment/workspace.module.css";

/**
 * GET-form filters for screener gather results (URL-driven, shareable).
 * Asset-class / liquidity controls stay disabled when MI does not expose those fields.
 */
export function ScreenerFilterBar({
  providers,
  symbols,
  assetClassExposed = false,
  assetClasses = [],
  liquidityExposed = false,
}: {
  providers: readonly string[];
  symbols: readonly string[];
  assetClassExposed?: boolean;
  assetClasses?: readonly string[];
  liquidityExposed?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (form: HTMLFormElement) => {
      const fd = new FormData(form);
      const next = new URLSearchParams();
      const symbolsVal = String(fd.get("symbols") ?? "").trim();
      const provider = String(fd.get("provider") ?? "ALL");
      const priced = String(fd.get("priced") ?? "ALL");
      const q = String(fd.get("q") ?? "").trim();
      const assetClass = String(fd.get("assetClass") ?? "ALL");
      const liquidity = String(fd.get("liquidity") ?? "ALL");
      if (symbolsVal) next.set("symbols", symbolsVal);
      if (provider && provider !== "ALL") next.set("provider", provider);
      if (priced && priced !== "ALL") next.set("priced", priced);
      if (q) next.set("q", q);
      if (assetClassExposed && assetClass && assetClass !== "ALL") next.set("assetClass", assetClass);
      if (liquidityExposed && liquidity && liquidity !== "ALL") next.set("liquidity", liquidity);
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [assetClassExposed, liquidityExposed, pathname, router],
  );

  return (
    <form
      className={styles.filterBar}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      aria-label="Screener filters"
    >
      <label className={styles.filterField}>
        <span>Symbols</span>
        <input
          name="symbols"
          className={styles.filterInput}
          defaultValue={searchParams?.get("symbols") ?? symbols.join(",")}
          placeholder="AAPL,MSFT,SPY"
        />
      </label>
      <label className={styles.filterField}>
        <span>Provider</span>
        <select name="provider" className={styles.filterSelect} defaultValue={searchParams?.get("provider") ?? "ALL"}>
          <option value="ALL">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Price</span>
        <select name="priced" className={styles.filterSelect} defaultValue={searchParams?.get("priced") ?? "ALL"}>
          <option value="ALL">All</option>
          <option value="HAS_PRICE">Has quote</option>
          <option value="NO_PRICE">NO_DATA quote</option>
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Asset class</span>
        <select
          name="assetClass"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("assetClass") ?? "ALL"}
          disabled={!assetClassExposed}
          title={assetClassExposed ? undefined : "NO_DATA — MI does not expose assetClass"}
        >
          <option value="ALL">{assetClassExposed ? "All classes" : "NO_DATA"}</option>
          {assetClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Liquidity</span>
        <select
          name="liquidity"
          className={styles.filterSelect}
          defaultValue={searchParams?.get("liquidity") ?? "ALL"}
          disabled={!liquidityExposed}
          title={
            liquidityExposed
              ? "Uses last timeSeries volume when MI provides it"
              : "NO_DATA — MI does not expose volume/liquidity"
          }
        >
          <option value="ALL">{liquidityExposed ? "All" : "NO_DATA"}</option>
          <option value="HAS_VOLUME">Has volume</option>
          <option value="NO_VOLUME">NO_DATA volume</option>
        </select>
      </label>
      <label className={styles.filterField}>
        <span>Search</span>
        <input
          name="q"
          className={styles.filterInput}
          defaultValue={searchParams?.get("q") ?? ""}
          placeholder="Filter results…"
        />
      </label>
      <button type="submit" className={styles.filterBtn} disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </button>
      {!assetClassExposed || !liquidityExposed ? (
        <span className={styles.filterHint}>
          Asset class / liquidity:{" "}
          {!assetClassExposed && !liquidityExposed
            ? "both NO_DATA"
            : !assetClassExposed
              ? "asset class NO_DATA"
              : "liquidity NO_DATA"}
        </span>
      ) : null}
    </form>
  );
}
