"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import {
  downloadReportExcelCsv,
  downloadReportMarkdown,
  downloadReportPdfHtml,
} from "@/lib/investment/reports-export";
import type {
  InvestmentPeriodReport,
  ReportListItem,
  ReportPeriodType,
  ReportsCenterSnapshot,
} from "@/lib/investment/reports-types";
import { REPORT_PERIOD_LABELS, REPORT_PERIOD_TYPES } from "@/lib/investment/reports-types";
import type { MlLearningSnapshot } from "@/lib/ml/types";
import styles from "@/styles/investment/workspace.module.css";

type Props = {
  readonly initial: ReportsCenterSnapshot;
};

export function ReportsCenterDashboard({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [snapshot, setSnapshot] = useState(initial);
  const [periodType, setPeriodType] = useState<string>("ALL");
  const [periodKey, setPeriodKey] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initial.selected?.id ?? null);
  const [compareId, setCompareId] = useState<string | null>(initial.compareWith?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (selectedId && snapshot.selected?.id === selectedId) return snapshot.selected;
    if (selectedId && snapshot.compareWith?.id === selectedId) return snapshot.compareWith;
    return snapshot.selected;
  }, [selectedId, snapshot]);

  const compareWith = useMemo(() => {
    if (!compareId) return null;
    if (snapshot.compareWith?.id === compareId) return snapshot.compareWith;
    if (snapshot.selected?.id === compareId) return snapshot.selected;
    return null;
  }, [compareId, snapshot]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    return snapshot.items.filter((item) => {
      if (periodType !== "ALL" && item.periodType !== periodType) return false;
      if (periodKey !== "ALL" && item.periodKey !== periodKey) return false;
      if (!query) return true;
      const hay = `${item.title} ${item.note} ${item.id} ${item.paperPnl}`.toLowerCase();
      return hay.includes(query);
    });
  }, [snapshot.items, periodType, periodKey, q]);

  const refresh = useCallback(
    async (opts?: { id?: string | null; compare?: string | null; autoEnsure?: boolean }) => {
      setBusy("refresh");
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts?.autoEnsure === false) params.set("autoEnsure", "0");
        const id = opts?.id !== undefined ? opts.id : selectedId;
        const compare = opts?.compare !== undefined ? opts.compare : compareId;
        if (id) params.set("id", id);
        if (compare) params.set("compare", compare);
        if (periodType !== "ALL") params.set("periodType", periodType);
        if (periodKey !== "ALL") params.set("periodKey", periodKey);
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/investment/reports?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as ReportsCenterSnapshot & { error?: string };
        if (body.error && !body.items) {
          setError(body.error);
          return;
        }
        setSnapshot(body);
        if (body.selected?.id) setSelectedId(body.selected.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refresh failed");
      } finally {
        setBusy(null);
      }
    },
    [selectedId, compareId, periodType, periodKey, q],
  );

  const generate = useCallback(
    async (type: ReportPeriodType) => {
      setBusy(`gen-${type}`);
      setError(null);
      try {
        const res = await fetch("/api/investment/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodType: type,
            periodKey: periodKey !== "ALL" ? periodKey : undefined,
          }),
        });
        const body = (await res.json()) as {
          report?: InvestmentPeriodReport;
          error?: string;
        };
        if (body.error && !body.report) {
          setError(body.error);
          return;
        }
        if (body.report) {
          setSelectedId(body.report.id);
          await refresh({ id: body.report.id, autoEnsure: false });
          startTransition(() => router.refresh());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generate failed");
      } finally {
        setBusy(null);
      }
    },
    [periodKey, refresh, router],
  );

  const selectItem = useCallback(
    async (item: ReportListItem) => {
      setSelectedId(item.id);
      await refresh({ id: item.id, autoEnsure: false });
    },
    [refresh],
  );

  const setCompare = useCallback(
    async (id: string | null) => {
      setCompareId(id);
      await refresh({ compare: id, autoEnsure: false });
    },
    [refresh],
  );

  return (
    <section className={styles.shellPage} aria-label="Reports Center">
      <form
        className={styles.filterBar}
        onSubmit={(e) => {
          e.preventDefault();
          void refresh({ autoEnsure: false });
        }}
        aria-label="Report filters"
      >
        <label className={styles.filterField}>
          <span>Tipo</span>
          <select
            className={styles.filterSelect}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {REPORT_PERIOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {REPORT_PERIOD_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Periodo</span>
          <select
            className={styles.filterSelect}
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
          >
            <option value="ALL">Todos</option>
            {snapshot.availablePeriodKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Buscar</span>
          <input
            className={styles.filterInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título, id, nota…"
          />
        </label>
        <button type="submit" className={styles.filterBtn} disabled={!!busy || pending}>
          {busy === "refresh" ? "Filtrando…" : "Aplicar"}
        </button>
        <button
          type="button"
          className={styles.filterBtn}
          disabled={!!busy}
          onClick={() => void refresh({ autoEnsure: true })}
        >
          Auto-ensure periodos
        </button>
      </form>

      <div className={styles.filterBar} aria-label="Generate reports">
        {REPORT_PERIOD_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.filterBtn}
            disabled={!!busy}
            onClick={() => void generate(t)}
          >
            {busy === `gen-${t}` ? "Generando…" : `Nuevo ${REPORT_PERIOD_LABELS[t]}`}
          </button>
        ))}
        <span className={styles.filterHint}>
          Cada generación crea una versión inmutable (nunca sobrescribe)
        </span>
      </div>

      {error ? <p className={styles.hubNote}>Error: {error}</p> : null}
      {snapshot.autoGenerated.length > 0 ? (
        <p className={styles.hubNote}>
          Auto-generados: {snapshot.autoGenerated.length} · total histórico: {snapshot.total}
        </p>
      ) : (
        <p className={styles.hubNote}>
          Histórico: {snapshot.total} informe(s) · filtrados: {filteredItems.length} · {snapshot.note}
        </p>
      )}

      {snapshot.mlLearning ? <MlLearningSection ml={snapshot.mlLearning} /> : null}

      <div className={styles.reportsLayout}>
        <article className={styles.panel} aria-label="Report history">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Historial</h2>
            <span className={filteredItems.length ? styles.monitorOk : styles.monitorWarn}>
              {filteredItems.length}
            </span>
          </div>
          {filteredItems.length === 0 ? (
            <p className={styles.hubNote}>NO_DATA — sin informes para estos filtros.</p>
          ) : (
            <ul className={styles.reportsHistoryList}>
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className={`${styles.reportHistoryItem}${
                    item.id === selectedId ? ` ${styles.reportHistoryItemActive}` : ""
                  }`}
                >
                  <button
                    type="button"
                    className={styles.reportHistoryBtn}
                    onClick={() => void selectItem(item)}
                  >
                    <strong>{item.title}</strong>
                    <br />
                    <span className={styles.monitorMetaText}>
                      {new Date(item.generatedAt).toLocaleString()} · Paper {item.paperPnl} ·
                      Shadow {item.shadowPnl}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.reportCompareBtn}
                    disabled={item.id === selectedId}
                    onClick={() => void setCompare(item.id === compareId ? null : item.id)}
                  >
                    {item.id === compareId ? "Quitar comparativa" : "Comparar con este"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        {selected ? (
          <article className={styles.panel} aria-label="Selected report">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>{selected.title}</h2>
              <span className={styles.monitorOk}>v{selected.version}</span>
            </div>
            <ul className={styles.panelList}>
              <li>Id: {selected.id}</li>
              <li>Generated: {new Date(selected.generatedAt).toLocaleString()}</li>
              <li>
                Sources: {selected.sourceSnapshots.join(", ")}
              </li>
              {selected.summaryMetrics.map((m) => (
                <li key={m.label}>
                  {m.label}: {m.value}
                </li>
              ))}
            </ul>
            <div className={styles.reportExportBar}>
              <button
                type="button"
                className={styles.filterBtn}
                onClick={() => downloadReportMarkdown(selected)}
              >
                Export Markdown
              </button>
              <button
                type="button"
                className={styles.filterBtn}
                onClick={() => downloadReportExcelCsv(selected)}
              >
                Export Excel (CSV)
              </button>
              <button
                type="button"
                className={styles.filterBtn}
                onClick={() => downloadReportPdfHtml(selected)}
              >
                Export PDF (HTML print)
              </button>
            </div>
          </article>
        ) : (
          <article className={styles.panel}>
            <p className={styles.hubNote}>Selecciona un informe del historial.</p>
          </article>
        )}
      </div>

      {selected ? (
        <div className={styles.grid} style={{ marginTop: 8 }}>
          <EquityCurveChart points={selected.paperEquityCurve} label="Paper equity" />
          <EquityCurveChart points={selected.shadowEquityCurve} label="Shadow equity" />
        </div>
      ) : null}

      {selected ? (
        <div className={styles.grid} style={{ marginTop: 8 }}>
          {selected.sections.map((section) => (
            <article key={section.id} className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{section.title}</h2>
                <span
                  className={
                    section.state === "READY" ? styles.monitorOk : styles.monitorWarn
                  }
                >
                  {section.state}
                </span>
              </div>
              <ul className={styles.panelList}>
                {section.lines.slice(0, 12).map((line, i) => (
                  <li key={`${section.id}-${i}`}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}

      {selected && compareWith && compareWith.id !== selected.id ? (
        <section className={styles.reportComparePanel} aria-label="Comparative">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Comparativa de versiones</h2>
            <span className={styles.monitorMetaText}>ANALYSIS_ONLY</span>
          </div>
          <ul className={styles.panelList}>
            <li>
              A: {selected.title} · Paper {selected.comparative.paperPnl} · Shadow{" "}
              {selected.comparative.shadowPnl}
            </li>
            <li>
              B: {compareWith.title} · Paper {compareWith.comparative.paperPnl} · Shadow{" "}
              {compareWith.comparative.shadowPnl}
            </li>
            <li>
              Δ matched: {selected.comparative.matchedCount - compareWith.comparative.matchedCount}
            </li>
            <li>
              Δ compare rows:{" "}
              {selected.comparative.compareRows - compareWith.comparative.compareRows}
            </li>
            <li>Generated A: {selected.generatedAt}</li>
            <li>Generated B: {compareWith.generatedAt}</li>
          </ul>
          <div className={styles.grid}>
            <EquityCurveChart
              points={compareWith.paperEquityCurve}
              label={`Compare Paper · ${compareWith.periodKey} v${compareWith.version}`}
            />
            <EquityCurveChart
              points={compareWith.shadowEquityCurve}
              label={`Compare Shadow · ${compareWith.periodKey} v${compareWith.version}`}
            />
          </div>
        </section>
      ) : null}
    </section>
  );
}

function MlLearningSection({ ml }: { readonly ml: MlLearningSnapshot }) {
  const curvePoints = ml.learningCurve.map((p) => ({
    index: p.index,
    equity: p.winRatePct,
  }));
  const statusClass =
    ml.status === "TRAINED" ? styles.monitorOk : styles.monitorWarn;

  return (
    <section className={styles.grid} style={{ marginTop: 8 }} aria-label="ML learning curve">
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>ML signal trainer</h2>
          <span className={statusClass}>{ml.status}</span>
        </div>
        <ul className={styles.panelList}>
          <li>
            Samples: {ml.labeledCount}/{ml.minSamples} labeled · {ml.totalSignals} signals
            recorded
          </li>
          <li>
            Last train: {ml.lastTrainedAt ? new Date(ml.lastTrainedAt).toLocaleString() : "—"}
            {ml.modelVersion != null ? ` · v${ml.modelVersion}` : ""}
          </li>
          <li>
            Weight caps [{ml.weightCaps.min}, {ml.weightCaps.max}] · {ml.note}
          </li>
          {ml.insights.slice(0, 5).map((line, i) => (
            <li key={`ml-insight-${i}`}>{line}</li>
          ))}
        </ul>
      </article>
      <EquityCurveChart points={curvePoints} label="Win rate learning curve (%)" />
    </section>
  );
}
