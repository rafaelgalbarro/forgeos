"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import type { InvestmentDashboardSnapshot } from "@/lib/investment/dashboard-snapshot.types";

function fmtMoney(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NO_DATA";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtPct(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

type OpportunitiesPayload = {
  opportunities?: Array<{ activo?: string; side?: string; score?: number }>;
  items?: unknown[];
  count?: number;
  error?: string;
};

type HeaderQuotes = {
  nav: number | null;
  dailyPnl: number | null;
  dailyPnlPct: number | null;
};

/**
 * Large home card for ForgeOS main dashboard (/os) — Block 7.
 */
export function InvestmentHomeCard() {
  const [snapshot, setSnapshot] = useState<InvestmentDashboardSnapshot | null>(null);
  const [oppCount, setOppCount] = useState<number | null>(null);
  const [lastSignal, setLastSignal] = useState<string>("NO_DATA");
  const [nav, setNav] = useState<number | null>(null);
  const [dailyPnl, setDailyPnl] = useState<number | null>(null);
  const [dailyPnlPct, setDailyPnlPct] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [dash, opps, hq] = await Promise.all([
        safeJsonFetch<InvestmentDashboardSnapshot & { error?: string }>("/api/investment/dashboard", {
          cache: "no-store",
        }),
        safeJsonFetch<OpportunitiesPayload>("/api/investment/opportunities", { cache: "no-store" }),
        safeJsonFetch<HeaderQuotes>("/api/investment/header-quotes", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (dash.ok && dash.data) {
        setSnapshot(dash.data);
        setError(dash.data.error ?? "");
      } else {
        setError(dash.error ?? "Snapshot unavailable");
      }
      if (opps.ok && opps.data) {
        const list = opps.data.opportunities ?? opps.data.items;
        setOppCount(
          typeof opps.data.count === "number"
            ? opps.data.count
            : Array.isArray(list)
              ? list.length
              : null,
        );
        const top = opps.data.opportunities?.[0];
        if (top?.activo && top.side) {
          setLastSignal(`${top.side} ${top.activo}${top.score != null ? ` · ${top.score.toFixed(0)}` : ""}`);
        }
      }
      if (hq.ok && hq.data) {
        setNav(hq.data.nav);
        setDailyPnl(hq.data.dailyPnl);
        setDailyPnlPct(hq.data.dailyPnlPct);
      }
    }

    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const broker = snapshot?.brokerStatus;
  const connected = Boolean(broker?.data?.connected);
  const dataSource = broker?.data?.dataSource ?? broker?.dataSource ?? "UNAVAILABLE";
  const portfolio =
    nav ?? snapshot?.portfolioSummary?.data?.totalValue ?? snapshot?.accountSummary?.data?.netLiquidation;
  const positions = snapshot?.portfolioSummary?.data?.positionCount;
  const riskLevel = snapshot?.riskSummary?.data?.level;
  const isDemo = dataSource === "DEMO";
  const pnlTone =
    dailyPnl == null
      ? ""
      : dailyPnl > 0
        ? styles.overviewPnlUp
        : dailyPnl < 0
          ? styles.overviewPnlDown
          : "";

  return (
    <Link href="/investment" className={styles.homeCard} data-panel-id="forgeos-investment-home-card">
      <div className={styles.homeCardHead}>
        <div>
          <p className={styles.productKicker}>Product</p>
          <h2 className={styles.homeCardTitle}>ForgeOS Investment</h2>
          <p className={styles.homeCardSubtitle}>AI Investment Operating System</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <span className={styles.readOnlyTag}>ANALYSIS_ONLY</span>
          {isDemo ? <span className={styles.monitorWarn}>DEMO</span> : null}
        </div>
      </div>
      <div className={styles.homeCardGrid}>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>NAV</span>
          <strong className={styles.hubValue} data-numeric="true">
            {fmtMoney(portfolio)}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>P&amp;L día</span>
          <strong className={`${styles.hubValue} ${pnlTone}`} data-numeric="true">
            {fmtMoney(dailyPnl)}
            {dailyPnlPct != null ? ` ${fmtPct(dailyPnlPct)}` : ""}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Última señal</span>
          <strong className={styles.hubValue}>{lastSignal}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Oportunidades</span>
          <strong className={styles.hubValue}>
            {oppCount === null ? "NO_DATA" : String(oppCount)}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Broker</span>
          <strong className={styles.hubValue}>
            {connected ? "CONNECTED" : broker?.state ?? "DISCONNECTED"}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Posiciones</span>
          <strong className={styles.hubValue}>
            {typeof positions === "number" ? String(positions) : "NO_DATA"}
          </strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Risk</span>
          <strong className={styles.hubValue}>{riskLevel ?? "NO_DATA"}</strong>
        </div>
        <div className={styles.hubItem}>
          <span className={styles.hubLabel}>Modo</span>
          <strong className={styles.hubValue}>{snapshot?.mode ?? "ANALYSIS_ONLY"}</strong>
        </div>
      </div>
      {error ? <p className={styles.homeCardNote}>Partial status · {error}</p> : null}
      <p className={styles.homeCardCta}>Abrir Investment →</p>
    </Link>
  );
}
