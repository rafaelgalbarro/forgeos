"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import styles from "@/styles/investment/workspace.module.css";

type HistoryEntry = {
  readonly id: string;
  readonly type: string;
  readonly generatedAt: string;
  readonly briefingDate: string;
  readonly pdfRelativePath: string;
  readonly jsonRelativePath: string;
  readonly emailStatus: string;
  readonly emailTo: string;
  readonly immutable: true;
};

type HistoryResponse = {
  readonly count?: number;
  readonly history?: readonly HistoryEntry[];
  readonly error?: string;
  readonly note?: string;
};

type GenerateResponse = {
  readonly ok?: boolean;
  readonly id?: string;
  readonly emailStatus?: string;
  readonly pdfRelativePath?: string;
  readonly error?: string;
  readonly note?: string;
};

/**
 * Reports Center — Morning Briefing panel (ANALYSIS_ONLY).
 * Additive UI: does not replace other report surfaces.
 */
export function MorningBriefingReportsPanel() {
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [note, setNote] = useState<string>("Loading history…");
  const [error, setError] = useState<string | null>(null);
  const [lastGenerate, setLastGenerate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/investment/reports/morning-briefing?limit=30", {
          cache: "no-store",
        });
        const json = (await res.json()) as HistoryResponse;
        setHistory(json.history ?? []);
        setNote(json.note ?? `Loaded ${json.count ?? 0} briefing(s)`);
        setError(json.error ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
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
        const res = await fetch("/api/investment/reports/morning-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = (await res.json()) as GenerateResponse;
        if (!res.ok || json.ok === false) {
          setError(json.error ?? "Generation failed");
          return;
        }
        setLastGenerate(
          `Generated ${json.id} · email=${json.emailStatus} · ${json.pdfRelativePath ?? ""}`,
        );
        setError(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    });
  };

  const newestFirst = [...history].reverse();

  return (
    <article className={styles.hub} aria-label="Morning Briefing">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title} style={{ fontSize: "1.25rem" }}>
            Morning Briefing
          </h2>
          <p className={styles.subtitle}>
            Pre-open PDF briefing (Europe/Madrid) — overnight, markets, news, macro,
            opportunities, risks, plan. ANALYSIS_ONLY · type{" "}
            <code>morning-briefing</code>.
          </p>
        </div>
        <span className={styles.readOnlyTag}>ANALYSIS_ONLY</span>
      </div>

      <div className={styles.hubGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Generate</h3>
            <span className={styles.badge}>{pending ? "WORKING" : "READY"}</span>
          </div>
          <ul className={styles.panelList}>
            <li>Cron: <code>npm run investment:morning-briefing</code> @ 08:00 Europe/Madrid</li>
            <li>API: <code>POST /api/investment/reports/morning-briefing</code></li>
            <li>Storage: <code>.forgeos/reports/morning-briefing/</code> (immutable)</li>
            <li>Email: env <code>INVESTMENT_BRIEFING_EMAIL_*</code> + SMTP (stub if missing)</li>
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
            <span className={styles.badge}>{newestFirst.length}</span>
          </div>
          <p className={styles.subtitle}>{note}</p>
          {newestFirst.length === 0 ? (
            <ul className={styles.panelList}>
              <li>NO_DATA — no morning briefings saved yet</li>
            </ul>
          ) : (
            <ul className={styles.panelList}>
              {newestFirst.map((h) => (
                <li key={h.id}>
                  <strong>{h.briefingDate}</strong> · {h.generatedAt} · email={h.emailStatus}
                  <br />
                  <code>{h.pdfRelativePath}</code>
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
