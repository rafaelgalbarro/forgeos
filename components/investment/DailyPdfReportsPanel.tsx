"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import styles from "@/styles/investment/workspace.module.css";

type DailyListItem = {
  readonly id: string;
  readonly generatedAt: string;
  readonly periodKey: string;
  readonly title: string;
  readonly version: number;
  readonly paperPnl: string;
  readonly shadowPnl: string;
  readonly note: string;
};

type ListResponse = {
  readonly total?: number;
  readonly items?: readonly DailyListItem[];
  readonly note?: string;
  readonly error?: string;
  readonly emailEnabled?: string;
};

type GenerateResponse = {
  readonly ok?: boolean;
  readonly pdfPath?: string;
  readonly htmlPath?: string;
  readonly jsonPath?: string;
  readonly error?: string;
  readonly email?: { readonly sent?: boolean; readonly reason?: string };
  readonly report?: { readonly id?: string; readonly title?: string };
};

/**
 * Reports Center — Daily PDF panel (ANALYSIS_ONLY).
 * Additive: complements period reports + morning briefing.
 */
export function DailyPdfReportsPanel() {
  const [items, setItems] = useState<readonly DailyListItem[]>([]);
  const [note, setNote] = useState("Loading daily PDF history…");
  const [error, setError] = useState<string | null>(null);
  const [lastGenerate, setLastGenerate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/investment/reports/daily?limit=20", { cache: "no-store" });
        const json = (await res.json()) as ListResponse;
        setItems(json.items ?? []);
        setNote(
          json.note ??
            `Daily PDF runs: ${json.total ?? 0} · email flag=${json.emailEnabled ?? "false"}`,
        );
        setError(json.error ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load daily reports");
        setNote("NO_DATA");
      }
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onGenerate = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/investment/reports/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const json = (await res.json()) as GenerateResponse;
        if (!res.ok || json.ok === false) {
          setError(json.error ?? "Daily PDF generation failed");
          return;
        }
        setLastGenerate(
          `Generated ${json.report?.id ?? "ok"} · ${json.pdfPath ?? ""} · email=${json.email?.reason ?? "stubbed"}`,
        );
        setError(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Daily PDF generation failed");
      }
    });
  };

  return (
    <article className={styles.hub} aria-label="Daily PDF report">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title} style={{ fontSize: "1.25rem" }}>
            Daily PDF report
          </h2>
          <p className={styles.subtitle}>
            End-of-day PDF with executive summary, markets, portfolio, P&amp;L, opportunities,
            risks, committee, and tomorrow plan. ANALYSIS_ONLY · never invents live P&amp;L.
          </p>
        </div>
        <span className={styles.readOnlyTag}>ANALYSIS_ONLY</span>
      </div>

      <div className={styles.hubGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Generate</h3>
            <span className={styles.readOnlyTag}>{pending ? "WORKING" : "READY"}</span>
          </div>
          <ul className={styles.panelList}>
            <li>
              Cron: <code>npm run report:investment-daily</code> (e.g. 17:00 weekdays)
            </li>
            <li>
              API: <code>POST /api/investment/reports/daily</code>
            </li>
            <li>
              Storage: <code>.forgeos/reports/investment/daily/</code> (immutable PDF+HTML)
            </li>
            <li>
              Email: <code>INVESTMENT_REPORT_EMAIL_ENABLED=false</code> stub (phase 2)
            </li>
          </ul>
          <p style={{ marginTop: "0.75rem" }}>
            <button type="button" onClick={onGenerate} disabled={pending}>
              {pending ? "Generating…" : "Generate now"}
            </button>
          </p>
          {lastGenerate ? <p className={styles.subtitle}>{lastGenerate}</p> : null}
          {error ? (
            <p className={styles.subtitle} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Immutable history</h3>
            <span className={styles.readOnlyTag}>{items.length}</span>
          </div>
          <p className={styles.subtitle}>{note}</p>
          {items.length === 0 ? (
            <ul className={styles.panelList}>
              <li>NO_DATA — no daily PDF reports saved yet</li>
            </ul>
          ) : (
            <ul className={styles.panelList}>
              {items.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong> · {item.generatedAt}
                  <br />
                  paper={item.paperPnl} · shadow={item.shadowPnl}
                </li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: "0.75rem" }}>
            <button type="button" onClick={refresh} disabled={pending}>
              Refresh history
            </button>
          </p>
        </div>
      </div>
    </article>
  );
}
