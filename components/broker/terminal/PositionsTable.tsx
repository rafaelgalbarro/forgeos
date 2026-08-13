"use client";

import { useMemo, useState, type ReactNode } from "react";
import { maskAccountId } from "@/lib/ibkr/account-mask";
import { formatNumber, formatOptional, formatQty, noData, optionalMarketField } from "./format";
import styles from "./terminal.module.css";
import type { IbkrPosition } from "./types";
import { useBrokerTerminal } from "./use-broker-terminal-data";

type SortKey =
  | "account"
  | "symbol"
  | "secType"
  | "position"
  | "avgCost"
  | "currency";

export function PositionsTable({
  selectedKey,
  onSelect,
}: {
  selectedKey: string | null;
  onSelect: (position: IbkrPosition | null) => void;
}) {
  const { snapshot } = useBrokerTerminal();
  const { positions, sectionStates, errors } = snapshot;

  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [assetFilter, setAssetFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const accounts = useMemo(
    () => Array.from(new Set(positions.map((p) => p.account))).sort(),
    [positions],
  );
  const currencies = useMemo(
    () => Array.from(new Set(positions.map((p) => p.currency).filter(Boolean))).sort(),
    [positions],
  );
  const assetClasses = useMemo(
    () => Array.from(new Set(positions.map((p) => p.secType).filter(Boolean))).sort(),
    [positions],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = positions.filter((p) => {
      if (p.position === 0) return false;
      if (accountFilter !== "ALL" && p.account !== accountFilter) return false;
      if (currencyFilter !== "ALL" && p.currency !== currencyFilter) return false;
      if (assetFilter !== "ALL" && p.secType !== assetFilter) return false;
      if (!q) return true;
      return (
        p.symbol.toLowerCase().includes(q) ||
        p.secType.toLowerCase().includes(q) ||
        p.currency.toLowerCase().includes(q) ||
        maskAccountId(p.account).toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [positions, search, accountFilter, currencyFilter, assetFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function rowKey(p: IbkrPosition) {
    return `${p.account}|${p.symbol}|${p.secType}|${p.currency}|${p.conId ?? ""}`;
  }

  return (
    <section className={styles.section} data-panel-id="positions-table">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Positions ({rows.length})</h2>
        <p className={styles.sectionNote}>
          State: {sectionStates.positions}
          {errors.positions ? ` · ${errors.positions}` : ""} · market fields = NO_DATA when unavailable
        </p>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          placeholder="Search symbol / account…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.select} value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="ALL">All accounts</option>
          {accounts.map((a) => (
            <option key={a} value={a}>
              {maskAccountId(a)}
            </option>
          ))}
        </select>
        <select className={styles.select} value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
          <option value="ALL">All currencies</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={styles.select} value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
          <option value="ALL">All asset classes</option>
          {assetClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Th onClick={() => toggleSort("account")} active={sortKey === "account"} dir={sortDir}>
                Account
              </Th>
              <Th onClick={() => toggleSort("symbol")} active={sortKey === "symbol"} dir={sortDir}>
                Symbol
              </Th>
              <th>Name</th>
              <Th onClick={() => toggleSort("secType")} active={sortKey === "secType"} dir={sortDir}>
                Asset class
              </Th>
              <Th onClick={() => toggleSort("position")} active={sortKey === "position"} dir={sortDir}>
                Qty
              </Th>
              <Th onClick={() => toggleSort("avgCost")} active={sortKey === "avgCost"} dir={sortDir}>
                Avg price
              </Th>
              <th>Current price</th>
              <th>Market value</th>
              <th>P&L €</th>
              <th>P&L %</th>
              <th>Weight</th>
              <Th onClick={() => toggleSort("currency")} active={sortKey === "currency"} dir={sortDir}>
                Currency
              </Th>
              <th>Sector</th>
              <th>Risk</th>
              <th>AI Signal</th>
              <th>Confidence</th>
              <th>Last update</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={17}>
                  {positions.length === 0 ? "No positions / NO_DATA" : "No rows match filters"}
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const key = rowKey(p);
                return (
                  <tr
                    key={key}
                    data-selected={selectedKey === key ? "true" : "false"}
                    onClick={() => onSelect(p)}
                  >
                    <td>{maskAccountId(p.account)}</td>
                    <td>{p.symbol}</td>
                    <td className={styles.emptyCell}>{formatOptional(p.name)}</td>
                    <td>{p.secType || noData()}</td>
                    <td>{formatQty(p.position)}</td>
                    <td>{formatNumber(p.avgCost, 4)}</td>
                    <td className={styles.emptyCell}>{optionalMarketField(p.marketPrice)}</td>
                    <td className={styles.emptyCell}>{optionalMarketField(p.marketValue)}</td>
                    <td className={styles.emptyCell}>{optionalMarketField(p.unrealizedPnl)}</td>
                    <td className={styles.emptyCell}>{optionalMarketField(p.unrealizedPnlPct)}</td>
                    <td className={styles.emptyCell}>{noData()}</td>
                    <td>{p.currency || noData()}</td>
                    <td className={styles.emptyCell}>{formatOptional(p.sector)}</td>
                    <td className={styles.emptyCell}>{noData()}</td>
                    <td className={styles.emptyCell}>{noData()}</td>
                    <td className={styles.emptyCell}>{noData()}</td>
                    <td className={styles.emptyCell}>{formatOptional(p.lastUpdate)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th onClick={onClick} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      {children}
      {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );
}
