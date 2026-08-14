"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { MARKETS_CATALOG } from "@/components/investment/markets-terminal.types";
import {
  OpportunitySignalCard,
  type OpportunityCardModel,
} from "@/components/investment/OpportunitySignalCard";
import type { OpportunitySide } from "@/lib/investment/opportunity-center";
import {
  FOREX_PAIRS,
  FOREX_RISK_POLICY,
  getForexSessionSnapshot,
  type ForexSessionSnapshot,
} from "@/lib/investment/forex";

type AssetModule = "forex" | "crypto";

type HeaderQuotes = {
  nav: number | null;
  dailyPnl: number | null;
  dailyPnlPct: number | null;
};

type OppPayload = {
  opportunities?: Array<{
    id: string;
    activo: string;
    side: OpportunitySide;
    score: number;
    confianza: number;
    mercado: string;
    tipo: string;
    researchHref: string;
    stopLoss: number | string;
    takeProfit: number | string;
  }>;
  count?: number;
};

function isAssetMatch(tipo: string, symbol: string, module: AssetModule): boolean {
  const t = tipo.toLowerCase();
  const s = symbol.toUpperCase();
  if (module === "forex") {
    return (
      t.includes("forex") ||
      t.includes("fx") ||
      FOREX_PAIRS.some((p) => p.pairId === s) ||
      /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY)/.test(s)
    );
  }
  return t.includes("crypto") || s.includes("BTC") || s.includes("ETH") || s.includes("-USD");
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

/**
 * Dedicated FOREX / Crypto module shell — scanner signals + account P&L strip.
 * ANALYSIS_ONLY · does not place orders.
 */
export function AssetClassModuleWorkspace({ module }: { module: AssetModule }) {
  const title = module === "forex" ? "FOREX" : "Crypto";
  const catalog = useMemo(() => {
    if (module === "forex") {
      return FOREX_PAIRS.map((p) => ({
        symbol: p.pairId,
        name: p.display,
        market: p.exchange,
        currency: p.currency,
      }));
    }
    return MARKETS_CATALOG.filter((c) => c.assetClass === module).map((c) => ({
      symbol: c.symbol,
      name: c.name,
      market: c.market,
      currency: c.currency ?? "",
    }));
  }, [module]);
  const [quotes, setQuotes] = useState<HeaderQuotes | null>(null);
  const [cards, setCards] = useState<OpportunityCardModel[]>([]);
  const [error, setError] = useState("");
  const [session, setSession] = useState<ForexSessionSnapshot | null>(null);

  useEffect(() => {
    if (module !== "forex") return;
    setSession(getForexSessionSnapshot());
    const t = setInterval(() => setSession(getForexSessionSnapshot()), 30_000);
    return () => clearInterval(t);
  }, [module]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [hq, opps] = await Promise.all([
        safeJsonFetch<HeaderQuotes>("/api/investment/header-quotes", { cache: "no-store" }),
        safeJsonFetch<OppPayload>("/api/investment/opportunities", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (hq.ok && hq.data) {
        setQuotes({
          nav: hq.data.nav ?? null,
          dailyPnl: hq.data.dailyPnl ?? null,
          dailyPnlPct: hq.data.dailyPnlPct ?? null,
        });
      }
      if (opps.ok && opps.data) {
        const filtered = (opps.data.opportunities ?? []).filter((o) =>
          isAssetMatch(o.tipo, o.activo, module),
        );
        setCards(
          filtered.slice(0, 12).map((o) => ({
            id: o.id,
            ticker: o.activo,
            side: o.side,
            score: o.score,
            confidence: o.confianza,
            mercado: o.mercado,
            researchHref: o.researchHref,
            stopLoss: typeof o.stopLoss === "number" ? o.stopLoss : null,
            takeProfit: typeof o.takeProfit === "number" ? o.takeProfit : null,
          })),
        );
      } else {
        setError(opps.error ?? "");
      }
    }
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [module]);

  const pnl = quotes?.dailyPnl ?? null;
  const pnlClass =
    pnl == null ? "" : pnl > 0 ? styles.overviewPnlUp : pnl < 0 ? styles.overviewPnlDown : "";

  return (
    <section className={styles.assetModule} aria-label={`${title} module`}>
      <header className={styles.assetModuleHead}>
        <div>
          <p className={styles.productKicker}>Módulo</p>
          <h1 className={styles.assetModuleTitle}>
            {module === "forex" ? "💱 FOREX" : "₿ Crypto"}
          </h1>
          <p className={styles.hubNote}>
            {module === "forex"
              ? `IBKR IDEALPRO · CASH · max ${FOREX_RISK_POLICY.maxConcurrentPairs} pares · SL≤${FOREX_RISK_POLICY.maxStopPips}p · TP≥${FOREX_RISK_POLICY.minTakeProfitPips}p · ANALYSIS_ONLY`
              : "Scanner · señales · P&L de cuenta (compartido) · ANALYSIS_ONLY"}
          </p>
          {module === "forex" && session ? (
            <p className={styles.hubNote}>
              {session.label}
              {session.highLiquidity ? " · overlap/liquidez alta" : ""}
            </p>
          ) : null}
        </div>
        <div className={styles.assetModulePnl}>
          <span className={styles.overviewLabel}>NAV</span>
          <strong data-numeric="true">{fmtMoney(quotes?.nav)}</strong>
          <span className={styles.overviewLabel}>P&amp;L día</span>
          <strong className={pnlClass} data-numeric="true">
            {fmtMoney(pnl)}
          </strong>
        </div>
      </header>

      <div className={styles.assetUniverse}>
        <h2 className={styles.oppEnhancedTitle}>
          Universo {title}
          {module === "forex" ? " (9 pares IDEALPRO)" : ""}
        </h2>
        <ul className={styles.assetUniverseList}>
          {catalog.map((c) => (
            <li key={c.symbol}>
              <strong>{c.symbol}</strong>
              <span>
                {c.name}
                {c.market ? ` · ${c.market}` : ""}
                {c.currency ? ` · ${c.currency}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.oppEnhancedSection}>
        <h2 className={styles.oppEnhancedTitle}>Señales {title}</h2>
        {cards.length === 0 ? (
          <p className={styles.oppEmpty}>
            Sin señales {title.toLowerCase()} de alta calidad ahora. Revisa{" "}
            <Link href="/investment/opportunities" className={styles.labInlineLink}>
              Opportunities
            </Link>{" "}
            o{" "}
            <Link href="/investment/markets" className={styles.labInlineLink}>
              Markets
            </Link>
            .
          </p>
        ) : (
          <div className={styles.oppCardGrid}>
            {cards.map((m) => (
              <OpportunitySignalCard key={m.id} model={m} />
            ))}
          </div>
        )}
        {error ? <p className={styles.oppError}>{error}</p> : null}
      </div>
    </section>
  );
}
