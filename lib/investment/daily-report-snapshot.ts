/**
 * Gather daily report inputs from existing ANALYSIS_ONLY snapshots.
 * Missing data → NO_DATA. Never invents live P&L or market prints.
 */

import "server-only";

import { getAuditTimeline } from "@/lib/investment/audit-timeline";
import { getCommitteeReplaySnapshot } from "@/lib/investment/committee-replay";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import {
  DAILY_REPORT_NO_DATA,
  DAILY_REPORT_SECTION_TITLES,
  type DailyReportGatherBundle,
  type DailyReportRichSection,
  type DailyReportSectionId,
} from "@/lib/investment/daily-report-types";
import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";
import { getOpportunityCenterSnapshot } from "@/lib/investment/opportunity-center-snapshot";
import { getPaperShadowComparison } from "@/lib/investment/paper-shadow-comparison";
import { getPerformanceSnapshot } from "@/lib/investment/performance-snapshot";
import { getRiskAlertsSnapshot } from "@/lib/investment/risk-alerts-snapshot";
import type { ReportMetricRow } from "@/lib/investment/reports-types";

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return DAILY_REPORT_NO_DATA;
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return DAILY_REPORT_NO_DATA;
  return `${n.toFixed(digits)}%`;
}

function section(
  id: DailyReportSectionId,
  state: DailyReportRichSection["state"],
  lines: readonly string[],
  extras?: Partial<DailyReportRichSection>,
): DailyReportRichSection {
  return {
    id,
    title: DAILY_REPORT_SECTION_TITLES[id],
    state,
    lines,
    ...extras,
  };
}

function periodKeyFrom(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `${label}: ${error.message}` : `${label}: failed`,
    };
  }
}

/**
 * Compose daily report gather bundle from live read-only / paper / memory sources.
 */
export async function gatherDailyReportBundle(options?: {
  readonly now?: Date;
  readonly refreshDashboard?: boolean;
}): Promise<DailyReportGatherBundle> {
  const now = options?.now ?? new Date();
  const generatedAt = now.toISOString();
  const periodKey = periodKeyFrom(now);
  const sourceSnapshots: string[] = [];
  const errors: string[] = [];

  if (options?.refreshDashboard !== false) {
    await safe("dashboard-refresh", () =>
      refreshInvestmentDashboardSnapshot({ force: true, preferCache: false }),
    );
  }

  const dash = getInvestmentDashboardSnapshot();
  sourceSnapshots.push("dashboard-snapshot");

  const perfRes = await safe("performance", () => getPerformanceSnapshot());
  const riskRes = await safe("risk-alerts", () => getRiskAlertsSnapshot());
  const oppRes = await safe("opportunities", () => getOpportunityCenterSnapshot());
  const committeeRes = await safe("committee", () => getCommitteeReplaySnapshot({ limit: 12 }));
  const auditRes = await safe("audit", () => getAuditTimeline({ limit: 24 }));
  const compareRes = await safe("paper-shadow", () => getPaperShadowComparison());
  const mi = getMarketIntelligenceStatus();
  sourceSnapshots.push("market-intelligence-status");

  if (perfRes.ok) sourceSnapshots.push("performance-snapshot");
  else errors.push(perfRes.error);
  if (riskRes.ok) sourceSnapshots.push("risk-alerts-snapshot");
  else errors.push(riskRes.error);
  if (oppRes.ok) sourceSnapshots.push("opportunity-center");
  else errors.push(oppRes.error);
  if (committeeRes.ok) sourceSnapshots.push("committee-replay");
  else errors.push(committeeRes.error);
  if (auditRes.ok) sourceSnapshots.push("audit-timeline");
  else errors.push(auditRes.error);
  if (compareRes.ok) sourceSnapshots.push("paper-shadow-comparison");
  else errors.push(compareRes.error);

  const perf = perfRes.ok ? perfRes.value : null;
  const risk = riskRes.ok ? riskRes.value : null;
  const opp = oppRes.ok ? oppRes.value : null;
  const committee = committeeRes.ok ? committeeRes.value : null;
  const audit = auditRes.ok ? auditRes.value : null;
  const compare = compareRes.ok ? compareRes.value : null;

  const paperPnl = perf?.paper.totalPnl ?? compare?.paper.totalPnl ?? null;
  const shadowPnl = perf?.shadow.hypotheticalPnl ?? compare?.shadow.hypotheticalPnl ?? null;

  const summaryMetrics: ReportMetricRow[] = [
    { label: "Periodo", value: periodKey },
    { label: "Modo", value: "ANALYSIS_ONLY" },
    { label: "LIVE_TRADING", value: "false" },
    { label: "Paper P&L", value: fmtNum(paperPnl) },
    { label: "Shadow P&L", value: fmtNum(shadowPnl) },
    {
      label: "Broker",
      value: dash.brokerStatus.data?.connected ? "CONNECTED" : dash.brokerStatus.state,
    },
    {
      label: "Posiciones",
      value:
        dash.portfolioSummary.data?.positionCount != null
          ? String(dash.portfolioSummary.data.positionCount)
          : DAILY_REPORT_NO_DATA,
    },
    {
      label: "Oportunidades A+/A",
      value: opp ? String(opp.count) : DAILY_REPORT_NO_DATA,
    },
    {
      label: "Alertas riesgo",
      value: risk ? String(risk.alerts.length) : DAILY_REPORT_NO_DATA,
    },
    {
      label: "MI providers",
      value: String(mi.totalConfigured),
    },
  ];

  const opportunities = opp?.opportunities ?? [];
  const topOpps = opportunities.slice(0, 8);
  const recommended = opportunities
    .filter((o) => o.escalateToCommittee || o.grade === "A+")
    .slice(0, 8);
  const watch = opportunities
    .filter((o) => o.escalateToRisk || o.grade === "A")
    .slice(0, 8);
  const riskAlerts = risk?.alerts ?? [];
  const positionRiskAlerts = riskAlerts.filter((a) => a.symbols.length > 0).slice(0, 12);

  const aiExecutiveConclusions: string[] = [];
  if (dash.committeeSummary.data?.recommendation) {
    aiExecutiveConclusions.push(
      `Comité (dashboard): ${dash.committeeSummary.data.recommendation}` +
        (typeof dash.committeeSummary.data.confidence === "number"
          ? ` · conf=${dash.committeeSummary.data.confidence.toFixed(2)}`
          : ""),
    );
  }
  if (committee?.entries[0]?.recommendation) {
    const e = committee.entries[0];
    aiExecutiveConclusions.push(
      `Última decisión memoria: ${e.recommendation}` +
        (e.symbol !== "NO_DATA" ? ` · ${e.symbol}` : "") +
        (e.confidence != null ? ` · conf=${e.confidence}` : ""),
    );
  }
  if (topOpps[0]) {
    aiExecutiveConclusions.push(
      `Mejor oportunidad: ${topOpps[0].activo} ${topOpps[0].side} grade=${topOpps[0].grade} score=${topOpps[0].score}`,
    );
  }
  if (riskAlerts.length) {
    aiExecutiveConclusions.push(
      `${riskAlerts.length} alerta(s) de riesgo dry-run (monitor=${risk?.monitorLabel ?? DAILY_REPORT_NO_DATA})`,
    );
  }
  if (!aiExecutiveConclusions.length) {
    aiExecutiveConclusions.push(
      "NO_DATA — sin conclusiones IA disponibles en snapshots actuales (no inventado).",
    );
  }

  const sections: DailyReportRichSection[] = [
    section(
      "resumen_ejecutivo",
      aiExecutiveConclusions.some((l) => !l.startsWith("NO_DATA")) ? "READY" : "NO_DATA",
      [
        `Informe diario ForgeOS Investment · ${periodKey}`,
        `Generado: ${generatedAt}`,
        `Fuentes: ${sourceSnapshots.join(", ")}`,
        ...aiExecutiveConclusions,
        ...(errors.length ? [`Avisos de captura: ${errors.join(" · ")}`] : []),
      ],
      {
        metrics: summaryMetrics,
        aiConclusions: aiExecutiveConclusions,
        indicators: [
          {
            label: "Health broker",
            value: String(dash.brokerStatus.state),
          },
          {
            label: "Brain",
            value: dash.brainStatus.data?.status ?? DAILY_REPORT_NO_DATA,
          },
          {
            label: "Monitor",
            value: risk?.monitorRunning ? "RUNNING" : risk ? "STOPPED" : DAILY_REPORT_NO_DATA,
          },
        ],
      },
    ),
    section(
      "estado_mercados",
      mi.totalConfigured > 0 ? "PARTIAL" : "NO_DATA",
      [
        mi.note,
        `Market providers: ${mi.marketProviders.map((p) => p.id).join(", ") || DAILY_REPORT_NO_DATA}`,
        `News providers: ${mi.newsProviders.map((p) => p.id).join(", ") || DAILY_REPORT_NO_DATA}`,
        `Economic providers: ${mi.economicProviders.map((p) => p.id).join(", ") || DAILY_REPORT_NO_DATA}`,
        `Trade gate: ${mi.tradeGate}`,
        `Dashboard provider status: ${dash.providerStatus.data?.marketProviderStatus ?? DAILY_REPORT_NO_DATA}`,
      ],
      {
        heatmaps: [
          ...mi.marketProviders.map((p) => ({
            label: p.id,
            value: "configured",
            intensity: 0.7 as number | null,
          })),
          ...(mi.marketProviders.length
            ? []
            : [{ label: "markets", value: DAILY_REPORT_NO_DATA, intensity: null }]),
        ],
      },
    ),
    section(
      "estado_cartera",
      dash.portfolioSummary.data ? "READY" : "NO_DATA",
      [
        `Estado: ${dash.portfolioSummary.state}`,
        `Fuente: ${dash.portfolioSummary.dataSource ?? dash.portfolioSummary.source ?? DAILY_REPORT_NO_DATA}`,
        `Valor total: ${fmtNum(dash.portfolioSummary.data?.totalValue)}`,
        `Cash ratio: ${fmtPct(dash.portfolioSummary.data?.cashRatioPct)}`,
        `Posiciones: ${dash.portfolioSummary.data?.positionCount ?? DAILY_REPORT_NO_DATA}`,
        `Órdenes abiertas: ${dash.portfolioSummary.data?.openOrderCount ?? DAILY_REPORT_NO_DATA}`,
        `Cuenta NL: ${fmtNum(dash.accountSummary.data?.netLiquidation)}`,
        `Buying power: ${fmtNum(dash.accountSummary.data?.buyingPower)}`,
      ],
      {
        metrics: [
          { label: "Total value", value: fmtNum(dash.portfolioSummary.data?.totalValue) },
          { label: "Net liquidation", value: fmtNum(dash.accountSummary.data?.netLiquidation) },
          { label: "Positions", value: String(dash.portfolioSummary.data?.positionCount ?? DAILY_REPORT_NO_DATA) },
        ],
      },
    ),
    section(
      "rentabilidad",
      perf?.paper.periodReturnCount || perf?.paper.sharpe != null ? "READY" : "NO_DATA",
      [
        perf?.paper.note ?? DAILY_REPORT_NO_DATA,
        `Win rate: ${fmtPct(perf?.paper.winRate != null ? perf.paper.winRate * 100 : null)}`,
        `Sharpe: ${fmtNum(perf?.paper.sharpe)}`,
        `Max DD: ${fmtPct(perf?.paper.maxDrawdownPct)}`,
        `Benchmark: ${perf?.benchmark.label ?? DAILY_REPORT_NO_DATA} · beta=${fmtNum(perf?.benchmark.beta)} alpha=${fmtNum(perf?.benchmark.alpha)}`,
        perf?.multiBenchmarkNote ?? "",
      ].filter(Boolean),
      {
        metrics: [
          { label: "Sharpe", value: fmtNum(perf?.paper.sharpe) },
          { label: "Max DD", value: fmtPct(perf?.paper.maxDrawdownPct) },
          { label: "Win rate", value: fmtPct(perf?.paper.winRate != null ? perf.paper.winRate * 100 : null) },
        ],
        heatmaps: (perf?.paper.bySymbol ?? []).slice(0, 12).map((b) => ({
          label: b.label,
          value: fmtNum(b.pnl),
          intensity:
            Number.isFinite(b.pnl) && Math.abs(b.pnl) > 0
              ? Math.min(1, Math.abs(b.pnl) / Math.max(1, Math.abs(paperPnl ?? b.pnl) || 1))
              : null,
        })),
      },
    ),
    section(
      "pnl",
      paperPnl != null || shadowPnl != null ? "READY" : "NO_DATA",
      [
        `Paper P&L (ledger): ${fmtNum(paperPnl)} · trades=${perf?.paper.tradeCount ?? compare?.paper.tradeCount ?? DAILY_REPORT_NO_DATA}`,
        `Shadow P&L (hypothetical): ${fmtNum(shadowPnl)} · ops=${perf?.shadow.operationCount ?? compare?.shadow.operationCount ?? DAILY_REPORT_NO_DATA}`,
        "Live P&L: NO_DATA — never invented from missing IBKR marks",
        compare?.note ?? "",
      ].filter(Boolean),
      {
        metrics: [
          { label: "Paper P&L", value: fmtNum(paperPnl) },
          { label: "Shadow P&L", value: fmtNum(shadowPnl) },
          { label: "Live P&L", value: DAILY_REPORT_NO_DATA },
        ],
        table: {
          headers: ["Bucket", "P&L", "Trades"],
          rows: [
            ...(perf?.paper.bySession ?? []).slice(0, 8).map((r) => [r.label, fmtNum(r.pnl), String(r.trades)] as const),
            ...(perf?.paper.bySession?.length
              ? []
              : [[DAILY_REPORT_NO_DATA, DAILY_REPORT_NO_DATA, DAILY_REPORT_NO_DATA] as const]),
          ],
        },
      },
    ),
    section(
      "operaciones",
      (perf?.paper.tradeCount ?? 0) > 0 || (audit?.count ?? 0) > 0 ? "PARTIAL" : "NO_DATA",
      [
        `Paper closed trades: ${perf?.paper.tradeCount ?? DAILY_REPORT_NO_DATA}`,
        `Shadow operations: ${perf?.shadow.operationCount ?? DAILY_REPORT_NO_DATA}`,
        `Audit items (memory): ${audit?.count ?? DAILY_REPORT_NO_DATA}`,
        audit?.note ?? "",
      ].filter(Boolean),
      {
        table: {
          headers: ["When", "Kind", "Symbol", "Summary"],
          rows: (audit?.items ?? []).slice(0, 15).map((item) => [
            item.occurredAt,
            item.kind,
            item.symbol,
            item.summary.slice(0, 80),
          ]),
        },
      },
    ),
    section(
      "nuevas_oportunidades",
      opportunities.length ? "READY" : "NO_DATA",
      [
        opp?.note ?? DAILY_REPORT_NO_DATA,
        `Count A+/A: ${opp?.count ?? 0}`,
        `Scan duration ms: ${opp?.scanDurationMs ?? DAILY_REPORT_NO_DATA}`,
      ],
      {
        table: {
          headers: ["Activo", "Side", "Grade", "Score", "Confianza", "Riesgo"],
          rows: topOpps.map((o) => [
            o.activo,
            o.side,
            o.grade,
            String(o.score),
            fmtNum(o.confianza),
            typeof o.riesgo === "string"
              ? o.riesgo
              : fmtNum(typeof o.riesgoPct === "number" ? o.riesgoPct : undefined),
          ]),
        },
      },
    ),
    section(
      "riesgos",
      dash.riskSummary.data || riskAlerts.length ? "READY" : "NO_DATA",
      [
        `Nivel: ${dash.riskSummary.data?.level ?? DAILY_REPORT_NO_DATA}`,
        `Concentración: ${fmtPct(dash.riskSummary.data?.concentrationRiskPct)}`,
        `Liquidez: ${fmtPct(dash.riskSummary.data?.liquidityRiskPct)}`,
        `Expected DD: ${fmtPct(dash.riskSummary.data?.expectedDrawdownPct)}`,
        `Factores: ${(dash.riskSummary.data?.factors ?? []).join(", ") || DAILY_REPORT_NO_DATA}`,
        risk?.note ?? "",
      ].filter(Boolean),
      {
        indicators: [
          { label: "Level", value: dash.riskSummary.data?.level ?? DAILY_REPORT_NO_DATA },
          { label: "Concentration", value: fmtPct(dash.riskSummary.data?.concentrationRiskPct) },
          { label: "Monitor label", value: risk?.monitorLabel ?? DAILY_REPORT_NO_DATA },
        ],
      },
    ),
    section(
      "alertas",
      riskAlerts.length ? "READY" : "NO_DATA",
      riskAlerts.length
        ? riskAlerts.slice(0, 12).map((a) => `[${a.severity}] ${a.title}: ${a.message}`)
        : [risk?.note ?? DAILY_REPORT_NO_DATA],
      {
        table: {
          headers: ["Severity", "Code", "Title", "Symbols", "Detected"],
          rows: riskAlerts.slice(0, 15).map((a) => [
            a.severity,
            a.code,
            a.title,
            a.symbols.join(",") || "—",
            a.detectedAt,
          ]),
        },
      },
    ),
    section(
      "noticias",
      mi.newsProviders.length ? "PARTIAL" : "NO_DATA",
      [
        mi.newsProviders.length
          ? `Providers: ${mi.newsProviders.map((p) => p.id).join(", ")} — headlines require explicit MI gather (not invented).`
          : "NO_DATA — configure NEWSAPI_KEY / RSS_FEED_URLS",
        "Headlines: NO_DATA (daily report does not fabricate news copy).",
      ],
    ),
    section(
      "calendario_macro",
      mi.economicProviders.length ? "PARTIAL" : "NO_DATA",
      [
        mi.economicProviders.length
          ? `Economic providers: ${mi.economicProviders.map((p) => p.id).join(", ")}`
          : "NO_DATA — configure FRED_API_KEY / ECB_ENABLED / WORLDBANK_ENABLED",
        "Eventos macro del día: NO_DATA (sin inventar calendario).",
      ],
    ),
    section(
      "comite_ia",
      (committee?.count ?? 0) > 0 || dash.committeeSummary.data?.recommendation ? "READY" : "NO_DATA",
      [
        committee?.note ?? dash.committeeSummary.data?.status ?? DAILY_REPORT_NO_DATA,
        ...(dash.committeeSummary.data?.reasoning ?? []).slice(0, 4),
      ],
      {
        aiConclusions: (committee?.entries ?? []).slice(0, 3).map((e) =>
          [
            e.occurredAt,
            e.symbol,
            e.recommendation ?? DAILY_REPORT_NO_DATA,
            e.consensus ?? DAILY_REPORT_NO_DATA,
            ...(e.reasoning.slice(0, 2) || [DAILY_REPORT_NO_DATA]),
          ].join(" · "),
        ),
        table: {
          headers: ["When", "Symbol", "Rec", "Conf", "Risk"],
          rows: (committee?.entries ?? []).slice(0, 10).map((e) => [
            e.occurredAt,
            e.symbol,
            e.recommendation ?? DAILY_REPORT_NO_DATA,
            e.confidence != null ? String(e.confidence) : DAILY_REPORT_NO_DATA,
            e.riskLevel ?? DAILY_REPORT_NO_DATA,
          ]),
        },
      },
    ),
    section(
      "mejores_oportunidades",
      topOpps.length ? "READY" : "NO_DATA",
      topOpps.length
        ? topOpps.map(
            (o) =>
              `${o.grade} ${o.activo} ${o.side} score=${o.score} conf=${fmtNum(o.confianza)}`,
          )
        : [DAILY_REPORT_NO_DATA],
      {
        table: {
          headers: ["Activo", "Grade", "Score", "Side", "Why"],
          rows: topOpps.map((o) => [
            o.activo,
            o.grade,
            String(o.score),
            o.side,
            typeof o.whyDetected === "string" ? o.whyDetected.slice(0, 60) : DAILY_REPORT_NO_DATA,
          ]),
        },
      },
    ),
    section(
      "operaciones_recomendadas",
      recommended.length ? "READY" : "NO_DATA",
      recommended.length
        ? recommended.map(
            (o) =>
              `${o.activo} ${o.side} grade=${o.grade} escalateCommittee=${o.escalateToCommittee}`,
          )
        : ["NO_DATA — sin oportunidades A+ / escalateToCommittee"],
    ),
    section(
      "operaciones_a_vigilar",
      watch.length ? "READY" : "NO_DATA",
      watch.length
        ? watch.map((o) => `${o.activo} ${o.side} grade=${o.grade} escalateRisk=${o.escalateToRisk}`)
        : ["NO_DATA — sin oportunidades a vigilar"],
    ),
    section(
      "posiciones_con_riesgo",
      positionRiskAlerts.length ? "READY" : "NO_DATA",
      positionRiskAlerts.length
        ? positionRiskAlerts.map(
            (a) => `${a.symbols.join(",")}: [${a.severity}] ${a.title} — ${a.message}`,
          )
        : [
            riskAlerts.length
              ? "Alertas sin símbolos asociados — ver sección Alertas"
              : DAILY_REPORT_NO_DATA,
          ],
      {
        table: {
          headers: ["Symbols", "Severity", "Code", "Message"],
          rows: positionRiskAlerts.map((a) => [
            a.symbols.join(","),
            a.severity,
            a.code,
            a.message.slice(0, 80),
          ]),
        },
      },
    ),
    section(
      "resumen_manana",
      "PARTIAL",
      [
        recommended[0]
          ? `Prioridad: revisar ${recommended[0].activo} (${recommended[0].grade})`
          : "Prioridad: NO_DATA — sin operaciones recomendadas",
        riskAlerts.length
          ? `Revisar ${riskAlerts.length} alerta(s) de riesgo antes de sesión`
          : "Riesgo: sin alertas activas en snapshot",
        mi.totalConfigured
          ? "MI: providers configurados — gather explícito si se necesitan quotes/news"
          : "MI: NO_DATA — configurar providers",
        "Órdenes: disabled · LIVE_TRADING=false · ANALYSIS_ONLY",
        ...aiExecutiveConclusions.slice(0, 2),
      ],
      { aiConclusions: aiExecutiveConclusions.slice(0, 3) },
    ),
  ];

  return {
    generatedAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    periodKey,
    sourceSnapshots,
    summaryMetrics,
    sections,
    paperEquityCurve: perf?.paper.equityCurve ?? [],
    shadowEquityCurve: perf?.shadow.equityCurve ?? [],
    comparative: {
      paperPnl: fmtNum(paperPnl),
      shadowPnl: fmtNum(shadowPnl),
      matchedCount: compare?.matchedCount ?? 0,
      compareRows: compare?.rows.length ?? 0,
      note: compare?.note ?? "NO_DATA — paper/shadow compare unavailable",
    },
    aiExecutiveConclusions,
    note: errors.length
      ? `Daily gather partial — ${errors.length} source error(s); missing fields are NO_DATA`
      : "Daily gather from existing ANALYSIS_ONLY snapshots — no invented live P&L",
  };
}
