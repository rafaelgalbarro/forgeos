"use client";

import { useCallback, useEffect, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { maskAccountId } from "@/lib/ibkr/account-mask";
import { formatNumber, noData } from "./format";
import styles from "./terminal.module.css";
import { useBrokerTerminal } from "./use-broker-terminal-data";

type MultiAccountApi = {
  accounts?: Array<{
    accountId: string;
    maskedId: string;
    source: string;
    state: "READY" | "NO_DATA";
    netLiquidation: number | null;
    totalCashValue: number | null;
    currency: string | null;
    note: string;
  }>;
  configuredAccountIds?: string[];
  note?: string;
};

/**
 * Multi-account IBKR section — merges IBKR_ACCOUNT_IDS with live snapshot.
 * Missing balances stay NO_DATA; never invents.
 */
export function MultiAccountPanel() {
  const { snapshot } = useBrokerTerminal();
  const [selected, setSelected] = useState<string>("");
  const [api, setApi] = useState<MultiAccountApi | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const result = await safeJsonFetch<MultiAccountApi>("/api/investment/accounts", {
      cache: "no-store",
    });
    if (!result.ok || !result.data) {
      setError(result.error ?? "Accounts unavailable");
      return;
    }
    setApi(result.data);
    setError("");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, snapshot.lastSyncAt]);

  const liveIds = Object.keys(snapshot.account ?? {});
  const managed = snapshot.status?.managedAccounts ?? [];
  const rows = api?.accounts?.length
    ? api.accounts
    : [...new Set([...managed, ...liveIds])].map((accountId) => {
        const tags = snapshot.account?.[accountId];
        const nl = tags?.NetLiquidation ? Number(tags.NetLiquidation.value) : null;
        const cash = tags?.TotalCashValue ? Number(tags.TotalCashValue.value) : null;
        const has = (nl != null && Number.isFinite(nl)) || (cash != null && Number.isFinite(cash));
        return {
          accountId,
          maskedId: maskAccountId(accountId),
          source: "broker",
          state: (has ? "READY" : "NO_DATA") as "READY" | "NO_DATA",
          netLiquidation: has && nl != null && Number.isFinite(nl) ? nl : null,
          totalCashValue: has && cash != null && Number.isFinite(cash) ? cash : null,
          currency: tags?.NetLiquidation?.currency ?? null,
          note: has ? "Live terminal" : "NO_DATA",
        };
      });

  const active = selected || rows[0]?.accountId || "";

  return (
    <section className={styles.section} data-panel-id="multi-account">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Multi-account</h2>
        <p className={styles.sectionNote}>
          {api?.note ?? "Configure IBKR_ACCOUNT_IDS for pinned accounts · ANALYSIS_ONLY"}
          {error ? ` · ${error}` : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className={styles.sectionNote}>NO_DATA — no managed or configured accounts</p>
      ) : (
        <>
          <label className={styles.sectionNote} style={{ display: "block", marginBottom: 8 }}>
            Account{" "}
            <select
              value={active}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Select IBKR account"
              style={{ marginLeft: 8 }}
            >
              {rows.map((row) => (
                <option key={row.accountId} value={row.accountId}>
                  {row.maskedId} · {row.state}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.metricHierarchyCompact}>
            {rows.map((row) => (
              <article
                key={row.accountId}
                className={styles.metricCardCompact}
                data-selected={row.accountId === active ? "true" : "false"}
                style={
                  row.accountId === active
                    ? { outline: "1px solid var(--term-border, #444)" }
                    : undefined
                }
              >
                <div className={styles.metricLabel}>
                  {row.maskedId} · {row.source}
                </div>
                <div className={styles.metricValueCompact}>
                  {row.netLiquidation == null
                    ? noData()
                    : `${formatNumber(row.netLiquidation)}${row.currency ? ` ${row.currency}` : ""}`}
                </div>
                <div className={styles.sectionNote}>
                  Cash:{" "}
                  {row.totalCashValue == null ? noData() : formatNumber(row.totalCashValue)} ·{" "}
                  {row.state}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
