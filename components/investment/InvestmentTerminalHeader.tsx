"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { getUsMarketSession } from "@/src/core/trading/market-session";

const POLL_MS = 30_000;

type Quote = { symbol: string; price: number | null; changePct: number | null };

type HeaderQuotesPayload = {
  spy: Quote;
  qqq: Quote;
  vix: Quote;
  nav: number | null;
  dailyPnl: number | null;
  dailyPnlPct: number | null;
  session: {
    phase: string;
    label: string;
    localTime: string;
    isTradeable: boolean;
  } | null;
};

export type InvestmentTerminalHeaderProps = {
  connected: boolean;
  streamConnected: boolean;
  refreshing: boolean;
  reconnecting?: boolean;
  halted: boolean;
  confirmHalt: boolean;
  onRefresh: () => void;
  onReconnect?: () => void;
  onConfirmHalt: () => void;
  onCancelHalt: () => void;
  onArmHalt: () => void;
  /** Fallback NAV from dashboard when header-quotes has no account data. */
  fallbackNav?: number;
  currency?: string;
};

function fmtPrice(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtMoney(n: number | null | undefined, currency = "USD"): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

function sessionBadge(
  phase: string | undefined,
  stylesMap: typeof styles,
): { text: string; className: string } {
  switch (phase) {
    case "REGULAR":
      return { text: "🟢 USA ABIERTO 15:30-22:00", className: stylesMap.hdrSessionOpen };
    case "PRE_MARKET":
      return { text: "🟡 PREMARKET 09:00-15:29", className: stylesMap.hdrSessionPre };
    case "AFTER_MARKET":
      return { text: "🟡 AFTERMARKET 22:00-01:00", className: stylesMap.hdrSessionPre };
    default:
      return { text: "🔴 MERCADO CERRADO", className: stylesMap.hdrSessionClosed };
  }
}

function pctClass(n: number | null, stylesMap: typeof styles): string {
  if (n == null || !Number.isFinite(n) || n === 0) return stylesMap.hdrPctFlat;
  return n > 0 ? stylesMap.hdrPctUp : stylesMap.hdrPctDown;
}

export function InvestmentTerminalHeader(props: InvestmentTerminalHeaderProps) {
  const [data, setData] = useState<HeaderQuotesPayload | null>(null);
  const [tick, setTick] = useState(0);
  const prevPrices = useRef<{ spy?: number; qqq?: number; vix?: number }>({});
  const [flash, setFlash] = useState<{ spy?: "up" | "down"; qqq?: "up" | "down"; vix?: "up" | "down" }>(
    {},
  );

  const load = useCallback(async () => {
    const result = await safeJsonFetch<HeaderQuotesPayload>("/api/investment/header-quotes", {
      cache: "no-store",
    });
    if (!result.ok || !result.data) return;

    const next = result.data;
    const nextFlash: typeof flash = {};
    const prev = prevPrices.current;
    if (next.spy.price != null && prev.spy != null && next.spy.price !== prev.spy) {
      nextFlash.spy = next.spy.price > prev.spy ? "up" : "down";
    }
    if (next.qqq.price != null && prev.qqq != null && next.qqq.price !== prev.qqq) {
      nextFlash.qqq = next.qqq.price > prev.qqq ? "up" : "down";
    }
    if (next.vix.price != null && prev.vix != null && next.vix.price !== prev.vix) {
      nextFlash.vix = next.vix.price > prev.vix ? "up" : "down";
    }
    prevPrices.current = {
      spy: next.spy.price ?? prev.spy,
      qqq: next.qqq.price ?? prev.qqq,
      vix: next.vix.price ?? prev.vix,
    };
    setFlash(nextFlash);
    setData(next);
    if (Object.keys(nextFlash).length) {
      window.setTimeout(() => setFlash({}), 700);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
      setTick((t) => t + 1);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const session = data?.session ?? (() => {
    const s = getUsMarketSession();
    return { phase: s.phase, label: s.sessionLabel, localTime: s.localTime, isTradeable: s.isTradeable };
  })();
  // tick forces re-render for client session clock when quotes idle
  void tick;

  const badge = sessionBadge(session.phase, styles);
  const nav = data?.nav ?? props.fallbackNav ?? null;
  const pnl = data?.dailyPnl ?? null;
  const pnlPct = data?.dailyPnlPct ?? null;
  const currency = props.currency ?? "USD";

  function quoteCell(q: Quote | undefined, key: "spy" | "qqq" | "vix", digits = 2) {
    const f = flash[key];
    const flashCls = f === "up" ? styles.hdrFlashUp : f === "down" ? styles.hdrFlashDown : "";
    return (
      <span className={`${styles.hdrQuote} ${flashCls}`} data-numeric="true">
        <span className={styles.hdrQuoteSym}>{q?.symbol ?? key.toUpperCase()}</span>
        <span className={styles.hdrQuotePx}>${fmtPrice(q?.price ?? null, digits)}</span>
        <span className={pctClass(q?.changePct ?? null, styles)}>{fmtPct(q?.changePct ?? null)}</span>
      </span>
    );
  }

  return (
    <header className={styles.hdrBar} aria-label="ForgeOS Investment terminal header">
      <div className={styles.hdrBrand}>
        <Link href="/investment" className={styles.hdrLogo}>
          ForgeOS Investment
        </Link>
      </div>

      <div className={styles.hdrTickers} aria-label="Market tickers">
        {quoteCell(data?.spy, "spy")}
        <span className={styles.hdrSep} aria-hidden>
          |
        </span>
        {quoteCell(data?.qqq, "qqq")}
        <span className={styles.hdrSep} aria-hidden>
          |
        </span>
        {quoteCell(data?.vix, "vix", 1)}
      </div>

      <div className={`${styles.hdrSession} ${badge.className}`}>{badge.text}</div>

      <div className={styles.hdrNavBlock} data-numeric="true">
        <span className={styles.hdrNavLabel}>NAV</span>
        <strong className={styles.hdrNavValue}>{fmtMoney(nav, currency)}</strong>
        <span className={pctClass(pnlPct, styles)}>
          {pnl != null ? `${pnl >= 0 ? "+" : ""}${fmtPrice(pnl, 0)}` : "—"}{" "}
          <span>({fmtPct(pnlPct)})</span>
        </span>
      </div>

      <div className={styles.hdrBroker}>
        <span
          className={props.connected ? styles.hdrDotOn : styles.hdrDotOff}
          aria-hidden
        />
        <span className={props.connected ? styles.hdrBrokerOn : styles.hdrBrokerOff}>
          {props.connected ? "BROKER ON" : "BROKER OFF"}
        </span>
        <span className={styles.hdrStream}>{props.streamConnected ? "SSE" : "·"}</span>
      </div>

      <div className={styles.hdrActions}>
        <button
          type="button"
          className={styles.hdrBtn}
          disabled={props.reconnecting}
          onClick={props.onReconnect}
          title="Reconectar broker IBKR"
        >
          {props.reconnecting ? "Reconectando…" : "🔄 Reconectar Broker"}
        </button>
        <button
          type="button"
          className={styles.hdrBtn}
          disabled={props.refreshing}
          onClick={props.onRefresh}
        >
          {props.refreshing ? "…" : "REFRESH"}
        </button>
        {!props.confirmHalt ? (
          <button
            type="button"
            className={styles.hdrBtnDanger}
            onClick={props.onArmHalt}
            aria-label="Emergency stop"
          >
            STOP
          </button>
        ) : (
          <span className={styles.hdrHaltConfirm}>
            <button type="button" className={styles.hdrBtnDanger} onClick={props.onConfirmHalt}>
              CONFIRM
            </button>
            <button type="button" className={styles.hdrBtn} onClick={props.onCancelHalt}>
              CANCEL
            </button>
          </span>
        )}
        <Link href="/investment/settings" className={styles.hdrBtn} title="Settings">
          ⚙️
        </Link>
        <Link href="/os" className={styles.hdrBtnGhost} title="Volver a ForgeOS">
          OS
        </Link>
      </div>

      {props.halted ? (
        <span className={styles.hdrHaltArmed} title="Emergency stop armed (dry-run)">
          HALT
        </span>
      ) : null}
    </header>
  );
}
