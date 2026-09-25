"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import styles from "@/styles/investment/workspace.module.css";
import type {
  EngineWiringStatus,
  InvestmentDossier,
  ResearchDashboardSnapshot,
  ResearchEngineRegistryRow,
} from "@/lib/investment/research/types";
import { researchDossierHref } from "@/lib/investment/research/deep-links";

function wiringClass(w: EngineWiringStatus): string {
  switch (w) {
    case "LIVE":
      return styles.researchLive ?? "";
    case "PARTIAL":
      return styles.researchPartial ?? "";
    case "STUB":
      return styles.researchStub ?? "";
    case "CONFIG_REQUIRED":
      return styles.researchConfig ?? "";
    default:
      return styles.researchNoData ?? "";
  }
}

function fmtScore(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "NO_DATA";
  return v.toFixed(1);
}

export function ResearchEngineDashboard({
  initial,
  focusSymbol,
}: {
  initial: ResearchDashboardSnapshot;
  focusSymbol?: string;
}) {
  const [snap, setSnap] = useState(initial);
  const [selected, setSelected] = useState(
    focusSymbol?.toUpperCase() ??
      initial.dossiers[0]?.symbol ??
      initial.symbols[0] ??
      "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dossier: InvestmentDossier | null =
    snap.dossiers.find((d) => d.symbol === selected) ?? snap.dossiers[0] ?? null;

  const refresh = useCallback(
    (opts?: { persist?: boolean; refresh?: boolean }) => {
      startTransition(async () => {
        try {
          setError(null);
          const q = new URLSearchParams();
          q.set("view", "dashboard");
          q.set("symbols", snap.symbols.join(","));
          if (opts?.persist) q.set("persist", "1");
          if (opts?.refresh) q.set("refresh", "1");
          const res = await fetch(`/api/investment/research?${q.toString()}`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const body = (await res.json()) as ResearchDashboardSnapshot;
          setSnap(body);
          if (
            selected &&
            !body.dossiers.some((d) => d.symbol === selected) &&
            body.dossiers[0]
          ) {
            setSelected(body.dossiers[0].symbol);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "refresh_failed");
        }
      });
    },
    [snap.symbols, selected],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refresh();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className={styles.researchRoot}>
      <div className={styles.labToolbar}>
        <p className={styles.labNote}>{snap.note}</p>
        <div className={styles.labMeta}>
          <span>MODE {snap.mode}</span>
          <span>ORDERS {snap.orderExecution}</span>
          <span>CACHE {snap.cacheHit ? "HIT" : "MISS"}</span>
          <span>MEMORY {snap.memoryCount}</span>
          {pending ? <span>UPDATING…</span> : null}
        </div>
      </div>

      {error ? (
        <p className={styles.researchError} role="alert">
          Refresh error: {error}
        </p>
      ) : null}

      <div className={styles.labFocusRow}>
        <label className={styles.labLabel}>
          Asset dossier
          <select
            className={styles.labSelect}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {snap.symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.labAction}
          onClick={() => refresh({ refresh: true })}
          disabled={pending}
        >
          Refresh
        </button>
        <button
          type="button"
          className={styles.labAction}
          onClick={() => refresh({ persist: true, refresh: true })}
          disabled={pending}
        >
          Snapshot to memory
        </button>
        <Link className={styles.labAction} href="/investment/opportunities">
          Opportunities →
        </Link>
      </div>

      <section className={styles.researchSection} aria-label="Engine registry">
        <h2 className={styles.researchSectionTitle}>Engine registry</h2>
        <div className={styles.researchEngineGrid}>
          {snap.engines.map((e: ResearchEngineRegistryRow) => (
            <article key={e.id} className={styles.researchEngineCard}>
              <header className={styles.researchEngineHead}>
                <strong>{e.title}</strong>
                <span className={wiringClass(e.wiring)}>{e.wiring}</span>
              </header>
              <p>{e.description}</p>
              <p className={styles.researchMuted}>
                {e.providers.length
                  ? `Providers: ${e.providers.join(", ")}`
                  : "Providers: none"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.researchSplit}>
        <section className={styles.researchSection} aria-label="Latest research">
          <h2 className={styles.researchSectionTitle}>Latest research</h2>
          <ul className={styles.researchList}>
            {snap.latestResearch.map((row) => (
              <li key={row.symbol}>
                <button
                  type="button"
                  className={styles.researchListBtn}
                  aria-pressed={selected === row.symbol}
                  onClick={() => setSelected(row.symbol)}
                >
                  <span>{row.symbol}</span>
                  <span className={wiringClass(row.status)}>{row.status}</span>
                  <span>{fmtScore(row.overall)}</span>
                </button>
                <p className={styles.researchMuted}>{row.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.researchSection} aria-label="Alerts and news">
          <h2 className={styles.researchSectionTitle}>Alerts · critical news · events</h2>
          <ul className={styles.researchList}>
            {snap.alerts.slice(0, 8).map((a) => (
              <li key={a.id}>
                <strong
                  className={
                    a.severity === "critical"
                      ? styles.researchAlertCritical
                      : a.severity === "watch"
                        ? styles.researchAlertWarn
                        : undefined
                  }
                >
                  [{a.severity}]
                </strong>{" "}
                {a.title}
                <p className={styles.researchMuted}>{a.detail}</p>
              </li>
            ))}
            {!snap.alerts.length ? (
              <li className={styles.researchMuted}>NO_DATA — no alerts</li>
            ) : null}
          </ul>
          <ul className={styles.researchList}>
            {snap.criticalNews.map((n, i) => (
              <li key={`${n.title}-${i}`}>
                <strong>{n.source}</strong>: {n.title}
                <p className={styles.researchMuted}>{n.publishedAt}</p>
              </li>
            ))}
            {!snap.criticalNews.length ? (
              <li className={styles.researchMuted}>
                NO_DATA — no news (configure NEWSAPI_KEY / RSS / etc.)
              </li>
            ) : null}
          </ul>
          <ul className={styles.researchList}>
            {snap.events.slice(0, 6).map((e) => (
              <li key={e.id}>
                [{e.kind}] {e.title}
              </li>
            ))}
            {!snap.events.length ? (
              <li className={styles.researchMuted}>NO_DATA — no events detected</li>
            ) : null}
          </ul>
        </section>
      </div>

      {dossier ? (
        <section className={styles.researchSection} aria-label="Investment dossier">
          <h2 className={styles.researchSectionTitle}>
            Investment dossier — {dossier.symbol}
          </h2>
          <p className={styles.researchSummary}>{dossier.executiveSummary}</p>
          <div className={styles.researchScoreGrid}>
            {dossier.scores.scores.map((s) => (
              <div key={s.kind} className={styles.researchScoreCard}>
                <span className={styles.researchMuted}>{s.kind}</span>
                <strong>{fmtScore(s.value)}</strong>
                <span className={wiringClass(s.label === "DEMO" ? "STUB" : s.label === "LIVE" ? "LIVE" : s.label === "PARTIAL" ? "PARTIAL" : "NO_DATA")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.researchEngineGrid}>
            {dossier.engines.map((e) => (
              <article key={e.engineId} className={styles.researchEngineCard}>
                <header className={styles.researchEngineHead}>
                  <strong>{e.title}</strong>
                  <span className={wiringClass(e.status)}>{e.status}</span>
                </header>
                <p>{e.summary}</p>
                <ul className={styles.researchList}>
                  {e.lines.slice(0, 5).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.researchSection} aria-label="Watchlists">
        <h2 className={styles.researchSectionTitle}>Intelligent watchlists</h2>
        <div className={styles.researchEngineGrid}>
          {snap.watchlists.map((w) => (
            <article key={w.id} className={styles.researchEngineCard}>
              <strong>{w.label}</strong>
              <p className={styles.researchMuted}>{w.note}</p>
              <p>{w.symbols.length ? w.symbols.join(", ") : "NO_DATA"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.researchSection} aria-label="Integrations">
        <h2 className={styles.researchSectionTitle}>Integration hooks</h2>
        <ul className={styles.researchList}>
          {Object.entries(snap.integrations).map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>: {v}
            </li>
          ))}
        </ul>
        <p className={styles.researchMuted}>
          Analyzed companies:{" "}
          {snap.analyzedCompanies.length
            ? snap.analyzedCompanies.join(", ")
            : "NO_DATA"}
          {" · "}
          <Link href="/investment/opportunities">Open Opportunities</Link>
          {" · "}
          Example:{" "}
          <Link href={researchDossierHref(selected || "AAPL")}>
            {researchDossierHref(selected || "AAPL")}
          </Link>
        </p>
      </section>
    </div>
  );
}
