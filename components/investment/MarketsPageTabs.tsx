"use client";

import { useState } from "react";
import { MarketsRegionalDashboard } from "@/components/investment/MarketsRegionalDashboard";
import { MarketsWatchlistPanel } from "@/components/investment/MarketsWatchlistPanel";
import styles from "@/styles/investment/markets-regional.module.css";

type TabId = "markets" | "watchlist";

export function MarketsPageTabs() {
  const [tab, setTab] = useState<TabId>("markets");

  return (
    <>
      <nav className={styles.marketsTabs} aria-label="Secciones Markets">
        <button
          type="button"
          className={tab === "markets" ? styles.marketsTabActive : styles.marketsTab}
          onClick={() => setTab("markets")}
        >
          Mercados
        </button>
        <button
          type="button"
          className={tab === "watchlist" ? styles.marketsTabActive : styles.marketsTab}
          onClick={() => setTab("watchlist")}
        >
          Mi Watchlist
        </button>
      </nav>
      {tab === "markets" ? <MarketsRegionalDashboard /> : <MarketsWatchlistPanel />}
    </>
  );
}
