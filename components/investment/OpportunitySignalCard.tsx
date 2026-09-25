"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import type { OpportunitySide } from "@/lib/investment/opportunity-center";

export type OpportunityCardModel = {
  id: string;
  ticker: string;
  side: OpportunitySide;
  score: number;
  /** 0–1 confidence; optional for enhanced scan cards. */
  confidence?: number;
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  grade?: string;
  mercado?: string;
  signals?: readonly string[];
  badges?: readonly string[];
  newsTitle?: string;
  researchHref?: string;
  confluenceLabel?: string;
  isNew?: boolean;
};

function sideClass(side: OpportunitySide): string {
  if (side === "BUY") return styles.oppSideBuy;
  if (side === "SELL") return styles.oppSideSell;
  return styles.oppSideHold;
}

function distPct(from: number | null | undefined, to: number | null | undefined): string | null {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return null;
  }
  const pct = ((to - from) / Math.abs(from)) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function fmtPx(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n >= 100 ? n.toFixed(2) : n.toFixed(4);
}

function scoreTone(score: number): string {
  if (score >= 80) return styles.oppCardScoreHigh;
  if (score >= 60) return styles.oppCardScoreMid;
  return styles.oppCardScoreLow;
}

type Props = {
  model: OpportunityCardModel;
  selected?: boolean;
  onSelect?: () => void;
  onExpandAnalysis?: () => void;
};

export function OpportunitySignalCard({ model, selected, onSelect, onExpandAnalysis }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [entered, setEntered] = useState(Boolean(model.isNew));

  useEffect(() => {
    if (!model.isNew) return;
    setEntered(true);
    const t = window.setTimeout(() => setEntered(false), 900);
    return () => window.clearTimeout(t);
  }, [model.isNew, model.id]);

  const confidence = model.confidence;
  const hotBuy =
    model.side === "BUY" &&
    ((confidence != null && confidence >= 0.8) || (confidence == null && model.score >= 80));

  const scorePct = Math.max(0, Math.min(100, model.score));
  const slDist = distPct(model.entry, model.stopLoss);
  const tpDist = distPct(model.entry, model.takeProfit);
  const executeHref = `/investment/orders?ticker=${encodeURIComponent(model.ticker)}&side=${model.side}&intent=stage`;

  return (
    <article
      className={[
        styles.oppSignalCard,
        model.side === "BUY" ? styles.oppSignalCardBuy : "",
        model.side === "SELL" ? styles.oppSignalCardSell : "",
        selected ? styles.oppSignalCardSelected : "",
        entered ? styles.oppSignalCardEnter : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-side={model.side}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <header className={styles.oppSignalHead}>
        <div className={styles.oppSignalTitle}>
          <strong className={styles.oppSignalTicker}>{model.ticker}</strong>
          <span className={sideClass(model.side)}>{model.side}</span>
          {model.grade ? <span className={styles.oppBadgeOk}>{model.grade}</span> : null}
          {hotBuy ? (
            <span className={styles.oppHotBadge} title="BUY con confianza alta">
              HOT BUY
            </span>
          ) : null}
        </div>
        {model.mercado ? <span className={styles.oppSignalMarket}>{model.mercado}</span> : null}
      </header>

      <div className={styles.oppScoreBlock}>
        <div className={styles.oppScoreMeta}>
          <span>Score</span>
          <strong className={`${styles.oppScoreValue} ${scoreTone(model.score)}`} data-numeric="true">
            {model.score.toFixed(0)}
          </strong>
          {confidence != null ? (
            <span className={styles.oppConfValue} data-numeric="true">
              Conf {(confidence * 100).toFixed(0)}%
            </span>
          ) : null}
        </div>
        <div className={styles.oppScoreTrack} aria-hidden>
          <div
            className={`${styles.oppScoreFill} ${scoreTone(model.score)}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>
      </div>

      <div className={styles.oppLevelsGrid}>
        <div>
          <span className={styles.oppLevelLabel}>Entry</span>
          <strong data-numeric="true">{fmtPx(model.entry)}</strong>
        </div>
        <div>
          <span className={styles.oppLevelLabel}>SL</span>
          <strong className={styles.oppLevelSl} data-numeric="true">
            {fmtPx(model.stopLoss)}
          </strong>
          {slDist ? (
            <span className={styles.oppLevelDist} data-numeric="true">
              {slDist}
            </span>
          ) : null}
        </div>
        <div>
          <span className={styles.oppLevelLabel}>TP</span>
          <strong className={styles.oppLevelTp} data-numeric="true">
            {fmtPx(model.takeProfit)}
          </strong>
          {tpDist ? (
            <span className={styles.oppLevelDist} data-numeric="true">
              {tpDist}
            </span>
          ) : null}
        </div>
      </div>

      {(model.confluenceLabel || (model.badges?.length ?? 0) > 0) && !expanded ? (
        <p className={styles.oppSignalSummary}>
          {model.confluenceLabel ?? model.badges?.[0]}
          {(model.badges?.length ?? 0) > 1 ? ` · +${(model.badges!.length - 1)}` : ""}
        </p>
      ) : null}

      {expanded ? (
        <div className={styles.oppSignalExpand}>
          {model.signals && model.signals.length > 0 ? (
            <ul className={styles.oppEnhancedSignals}>
              {model.signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
          {model.newsTitle ? <p className={styles.oppEnhancedNews}>{model.newsTitle}</p> : null}
          {model.researchHref ? (
            <Link
              href={model.researchHref}
              className={styles.labInlineLink}
              onClick={(e) => e.stopPropagation()}
            >
              Abrir dossier de research →
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className={styles.oppCardActions}>
        {model.side === "BUY" ? (
          <Link
            href={executeHref}
            className={styles.oppBtnExecute}
            onClick={(e) => e.stopPropagation()}
            title="Abre Orders en modo stage — no envía la orden automáticamente"
          >
            ⚡ EJECUTAR AHORA
          </Link>
        ) : null}
        <button
          type="button"
          className={styles.oppBtnAnalysis}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
            onExpandAnalysis?.();
          }}
        >
          👁 {expanded ? "OCULTAR" : "VER ANÁLISIS"}
        </button>
      </div>
    </article>
  );
}
