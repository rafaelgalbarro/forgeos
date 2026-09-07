/**
 * Assemble Morning Briefing content from existing Investment snapshots.
 * ANALYSIS_ONLY — never invents market facts; missing → NO_DATA.
 */

import type {
  BriefingLine,
  MorningBriefingDocument,
  MorningBriefingSection,
} from "./morning-briefing.types";
import { MORNING_BRIEFING_TYPE } from "./morning-briefing.types";
import { buildMorningBriefingId } from "./morning-briefing-storage";

/** Schedule timezone for pre-open cron (EU session focus). */
export const MORNING_BRIEFING_TIMEZONE = "Europe/Madrid";

/**
 * Cron assumption (document clearly for operators):
 * - Timezone: Europe/Madrid
 * - Target: before US equity cash open (~15:30 Madrid in standard time /
 *   ~14:30 during US DST) AND useful ahead of EU cash open (~09:00 Madrid).
 * - Recommended cron: `0 8 * * 1-5` Europe/Madrid (08:00 Mon–Fri) —
 *   after Asia close / overnight tape, before EU cash open.
 * - This is NOT an order trigger — ANALYSIS_ONLY briefing only.
 */

function formatDateInTz(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value ?? "NO_DATA";
    const m = parts.find((p) => p.type === "month")?.value ?? "NO_DATA";
    const d = parts.find((p) => p.type === "day")?.value ?? "NO_DATA";
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function line(text: string, state: BriefingLine["state"] = "READY"): BriefingLine {
  return { text, state };
}

function noData(reason: string): BriefingLine {
  return { text: `NO_DATA — ${reason}`, state: "NO_DATA" };
}

function sectionState(lines: readonly BriefingLine[]): MorningBriefingSection["state"] {
  if (!lines.length) return "NO_DATA";
  const ready = lines.filter((l) => l.state === "READY").length;
  const missing = lines.filter((l) => l.state === "NO_DATA").length;
  if (ready === 0) return "NO_DATA";
  if (missing > 0) return "PARTIAL";
  return "READY";
}

function changePctFromSnapshot(snapshot: {
  timeSeries?: { points?: ReadonlyArray<{ close?: number }> };
}): number | null {
  const points = snapshot.timeSeries?.points;
  if (!points || points.length < 2) return null;
  const prev = points[points.length - 2]?.close;
  const last = points[points.length - 1]?.close;
  if (typeof prev !== "number" || prev === 0 || typeof last !== "number") return null;
  return ((last - prev) / prev) * 100;
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

export type BuildMorningBriefingOptions = {
  readonly now?: Date;
  readonly id?: string;
  /** Skip heavy gathers (used in ultra-light tests). */
  readonly skipGathers?: boolean;
};

/**
 * Wire MI / dashboard / opportunities / risk / committee / news / calendar.
 */
export async function buildMorningBriefingDocument(
  options: BuildMorningBriefingOptions = {},
): Promise<MorningBriefingDocument> {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const briefingDate = formatDateInTz(now, MORNING_BRIEFING_TIMEZONE);
  const id = options.id ?? buildMorningBriefingId(now);
  const sourcesUsed: string[] = [];

  const sections: MorningBriefingSection[] = [];

  // Parallel gathers — failures become NO_DATA, never abort.
  const [dashRes, miRes, oppRes, riskRes, committeeRes, auditRes, miStatusRes] =
    options.skipGathers
      ? []
      : await Promise.all([
          safe("dashboard", async () => {
            const { refreshInvestmentDashboardSnapshot } = await import(
              "@/lib/investment/dashboard-snapshot"
            );
            return refreshInvestmentDashboardSnapshot({ force: false, preferCache: true });
          }),
          safe("screener-gather", async () => {
            const { gatherScreener } = await import("@/lib/investment/screener-gather");
            return gatherScreener();
          }),
          safe("opportunities", async () => {
            const { getOpportunityCenterSnapshot } = await import(
              "@/lib/investment/opportunity-center-snapshot"
            );
            return getOpportunityCenterSnapshot();
          }),
          safe("risk-alerts", async () => {
            const { getRiskAlertsSnapshot } = await import(
              "@/lib/investment/risk-alerts-snapshot"
            );
            return getRiskAlertsSnapshot();
          }),
          safe("committee", async () => {
            const { getCommitteeReplaySnapshot } = await import(
              "@/lib/investment/committee-replay"
            );
            return getCommitteeReplaySnapshot({ limit: 5 });
          }),
          safe("audit", async () => {
            const { getAuditTimeline } = await import("@/lib/investment/audit-timeline");
            return getAuditTimeline({ limit: 8 });
          }),
          safe("mi-status", async () => {
            const { getMarketIntelligenceStatus } = await import(
              "@/lib/investment/market-intelligence-status"
            );
            return getMarketIntelligenceStatus();
          }),
        ]);

  const dash = dashRes?.ok ? dashRes.value : null;
  const mi = miRes?.ok ? miRes.value : null;
  const opps = oppRes?.ok ? oppRes.value : null;
  const risk = riskRes?.ok ? riskRes.value : null;
  const committee = committeeRes?.ok ? committeeRes.value : null;
  const audit = auditRes?.ok ? auditRes.value : null;
  const miStatus = miStatusRes?.ok ? miStatusRes.value : null;

  if (dash) sourcesUsed.push("dashboard");
  if (mi && !mi.empty) sourcesUsed.push("market-intelligence");
  if (opps) sourcesUsed.push("opportunities");
  if (risk) sourcesUsed.push("risk-alerts");
  if (committee) sourcesUsed.push("committee");
  if (audit) sourcesUsed.push("audit");
  if (miStatus) sourcesUsed.push("mi-status");

  // 1) ¿Qué ha pasado esta noche?
  {
    const lines: BriefingLine[] = [];
    if (audit?.items?.length) {
      for (const item of audit.items.slice(0, 6)) {
        lines.push(line(`${item.occurredAt}: [${item.kind}] ${item.symbol} — ${item.summary}`));
      }
    }
    if (dash?.recentDecisions?.data?.length) {
      for (const d of dash.recentDecisions.data.slice(0, 4)) {
        lines.push(line(`Decision: ${d.label}${d.at ? ` @ ${d.at}` : ""}`));
      }
    }
    if (dash?.recentSignals?.data?.length) {
      for (const s of dash.recentSignals.data.slice(0, 4)) {
        lines.push(
          line(
            `Signal: ${s.name ?? "NO_DATA"} ${s.direction ?? ""} str=${s.strength ?? "NO_DATA"} ${s.timeframe ?? ""}`.trim(),
          ),
        );
      }
    }
    if (!lines.length) {
      lines.push(
        noData(
          auditRes && !auditRes.ok
            ? auditRes.error
            : "no overnight audit/decisions/signals in memory",
        ),
      );
    }
    sections.push({
      id: "overnight",
      title: "Qué ha pasado esta noche",
      question: "¿Qué ha pasado esta noche?",
      state: sectionState(lines),
      lines,
      source: "audit-timeline + dashboard",
    });
  }

  // Market strength / weakness from MI changePct
  const marketMoves: { symbol: string; changePct: number }[] = [];
  if (mi?.result?.marketSnapshots) {
    for (const snap of mi.result.marketSnapshots) {
      const pct = changePctFromSnapshot(snap);
      if (pct != null && snap.symbol) {
        marketMoves.push({ symbol: String(snap.symbol).toUpperCase(), changePct: pct });
      }
    }
  }
  marketMoves.sort((a, b) => b.changePct - a.changePct);

  // 2) Strong markets
  {
    const strong = marketMoves.filter((m) => m.changePct > 0).slice(0, 5);
    const lines: BriefingLine[] = strong.length
      ? strong.map((m) => line(`${m.symbol}: ${m.changePct.toFixed(2)}% (last bar vs prior)`))
      : [
          noData(
            miRes && !miRes.ok
              ? miRes.error
              : mi?.empty
                ? "no MI providers configured"
                : "no positive movers in gathered symbols",
          ),
        ];
    sections.push({
      id: "strong-markets",
      title: "Mercados fuertes",
      question: "¿Qué mercados están fuertes?",
      state: sectionState(lines),
      lines,
      source: "screener-gather / MI",
    });
  }

  // 3) Weak markets
  {
    const weak = [...marketMoves].filter((m) => m.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5);
    const lines: BriefingLine[] = weak.length
      ? weak.map((m) => line(`${m.symbol}: ${m.changePct.toFixed(2)}% (last bar vs prior)`))
      : [
          noData(
            miRes && !miRes.ok
              ? miRes.error
              : mi?.empty
                ? "no MI providers configured"
                : "no negative movers in gathered symbols",
          ),
        ];
    sections.push({
      id: "weak-markets",
      title: "Mercados débiles",
      question: "¿Qué mercados están débiles?",
      state: sectionState(lines),
      lines,
      source: "screener-gather / MI",
    });
  }

  // 4) Critical news
  {
    const news = mi?.result?.news ?? [];
    const lines: BriefingLine[] = news.length
      ? news.slice(0, 8).map((n) =>
          line(
            `${n.publishedAt}: ${n.title} (${n.source}${n.symbols?.length ? ` · ${n.symbols.join(",")}` : ""})`,
          ),
        )
      : [
          noData(
            miStatus && miStatus.newsProviders.length === 0
              ? "configure NEWSAPI_KEY / RSS_FEED_URLS"
              : "no news items returned",
          ),
        ];
    sections.push({
      id: "critical-news",
      title: "Noticias críticas",
      question: "Noticias críticas",
      state: sectionState(lines),
      lines,
      source: "market-intelligence news",
    });
  }

  // 5) Earnings — opportunity scanner may surface earnings detection; else NO_DATA
  {
    const earnLines: BriefingLine[] = [];
    if (opps?.opportunities?.length) {
      for (const o of opps.opportunities.slice(0, 12)) {
        const detection = typeof o.detection === "string" ? o.detection : "";
        if (detection.toLowerCase().includes("earn")) {
          earnLines.push(
            line(`${o.activo}: ${detection} · grade ${o.grade} · score ${o.score}`),
          );
        }
        for (const d of o.details ?? []) {
          if (d.id?.toLowerCase().includes("earn") || d.title?.toLowerCase().includes("earn")) {
            earnLines.push(line(`${o.activo}: ${d.summary || d.title}`));
          }
        }
      }
    }
    if (!earnLines.length) {
      earnLines.push(noData("no earnings events in opportunity/MI gather"));
    }
    sections.push({
      id: "earnings",
      title: "Resultados empresariales",
      question: "Resultados empresariales",
      state: sectionState(earnLines),
      lines: earnLines.slice(0, 8),
      source: "opportunity-center",
    });
  }

  // 6) Macro calendar
  {
    const econ = mi?.result?.economicIndicators ?? [];
    const lines: BriefingLine[] = econ.length
      ? econ.slice(0, 8).map((e) =>
          line(`${e.label || e.key}: ${e.value}${e.unit ? ` ${e.unit}` : ""} (${e.period}) · ${e.providerId}`),
        )
      : [
          noData(
            miStatus && miStatus.economicProviders.length === 0
              ? "configure FRED_API_KEY / ECB_ENABLED / ALPHA_VANTAGE economic"
              : "no economic indicators returned",
          ),
        ];
    if (miStatus?.economicProviders?.length) {
      lines.push(
        line(
          `Economic providers configured: ${miStatus.economicProviders.map((p) => p.id).join(", ")}`,
          econ.length ? "READY" : "PARTIAL",
        ),
      );
    }
    sections.push({
      id: "macro-calendar",
      title: "Calendario macro",
      question: "Calendario macro",
      state: sectionState(lines),
      lines,
      source: "market-intelligence economic + calendar status",
    });
  }

  // 7) Top opportunities
  {
    const list = opps?.opportunities ?? [];
    const lines: BriefingLine[] = list.length
      ? list.slice(0, 5).map((o) =>
          line(
            `${o.grade} ${o.activo} (${o.mercado}) ${o.side} score=${o.score} conf=${o.confianza}${
              typeof o.riesgo === "string" ? ` risk=${o.riesgo}` : ""
            }`,
          ),
        )
      : [
          noData(
            oppRes && !oppRes.ok ? oppRes.error : "no A+/A opportunities from Opportunity Center",
          ),
        ];
    sections.push({
      id: "top-opportunities",
      title: "Top oportunidades",
      question: "Top oportunidades",
      state: sectionState(lines),
      lines,
      source: "opportunity-center",
    });
  }

  // 8) Top risks
  {
    const alerts = risk?.alerts ?? [];
    const riskSummary = dash?.riskSummary?.data;
    const lines: BriefingLine[] = [];
    if (riskSummary) {
      lines.push(
        line(
          `Portfolio risk level=${riskSummary.level ?? "NO_DATA"} conc=${riskSummary.concentrationRiskPct ?? "NO_DATA"}% dd=${riskSummary.expectedDrawdownPct ?? "NO_DATA"}%`,
          riskSummary.level ? "READY" : "NO_DATA",
        ),
      );
      if (riskSummary.factors?.length) {
        lines.push(line(`Factors: ${riskSummary.factors.join(", ")}`));
      }
    }
    for (const a of alerts.slice(0, 6)) {
      lines.push(line(`[${a.severity}] ${a.title}: ${a.message} (${a.source})`));
    }
    if (!lines.length) {
      lines.push(
        noData(riskRes && !riskRes.ok ? riskRes.error : "no risk summary or breach alerts"),
      );
    }
    sections.push({
      id: "top-risks",
      title: "Top riesgos",
      question: "Top riesgos",
      state: sectionState(lines),
      lines,
      source: "risk-alerts + dashboard.riskSummary",
    });
  }

  // 9) Plan del día
  {
    const lines: BriefingLine[] = [];
    const committeeData = dash?.committeeSummary?.data;
    if (committeeData?.recommendation) {
      lines.push(
        line(
          `Committee: ${committeeData.recommendation} (conf=${committeeData.confidence ?? "NO_DATA"}) status=${committeeData.status ?? "NO_DATA"}`,
        ),
      );
      for (const r of committeeData.reasoning?.slice(0, 3) ?? []) {
        lines.push(line(`Reasoning: ${r}`));
      }
    }
    if (committee?.entries?.length) {
      for (const e of committee.entries.slice(0, 3)) {
        lines.push(
          line(
            `Replay ${e.symbol}: ${e.recommendation ?? "NO_DATA"} conf=${e.confidence ?? "NO_DATA"} @ ${e.occurredAt}`,
          ),
        );
      }
    }
    lines.push(
      line("Plan constraint: ANALYSIS_ONLY — no orders from Morning Briefing", "READY"),
    );
    if (lines.length === 1) {
      lines.unshift(noData("no committee recommendation available"));
    }
    sections.push({
      id: "day-plan",
      title: "Plan del día",
      question: "Plan del día",
      state: sectionState(lines),
      lines,
      source: "dashboard.committee + committee-replay",
    });
  }

  // 10) Prioridades
  {
    const lines: BriefingLine[] = [];
    const topOpp = opps?.opportunities?.[0];
    if (topOpp) {
      lines.push(line(`1. Review opportunity ${topOpp.activo} (${topOpp.grade})`));
    } else {
      lines.push(line("1. Review Opportunity Center — currently NO_DATA", "NO_DATA"));
    }
    const topAlert = risk?.alerts?.[0];
    if (topAlert) {
      lines.push(line(`2. Investigate risk alert: ${topAlert.title}`));
    } else {
      lines.push(line("2. Confirm risk monitor healthy (no open breach alerts)", "READY"));
    }
    lines.push(line("3. Check macro calendar / economic providers before EU/US open"));
    lines.push(line("4. Re-read committee stance before any supervised action (orders LOCKED)"));
    sections.push({
      id: "priorities",
      title: "Prioridades",
      question: "Prioridades",
      state: sectionState(lines),
      lines,
      source: "opportunities + risk + calendar",
    });
  }

  // 11) Alertas
  {
    const lines: BriefingLine[] = [];
    for (const a of (risk?.alerts ?? []).slice(0, 8)) {
      lines.push(
        line(`[${a.severity}] ${a.code}: ${a.message} @ ${a.detectedAt}`),
      );
    }
    if (dash?.brokerStatus?.data && !dash.brokerStatus.data.connected) {
      lines.push(line("Broker disconnected — IBKR status DISCONNECTED", "PARTIAL"));
    }
    if (dash?.runtimeHealth?.data?.note) {
      lines.push(line(`Runtime: ${dash.runtimeHealth.data.note}`));
    }
    if (!lines.length) {
      lines.push(noData("no active alerts"));
    }
    sections.push({
      id: "alerts",
      title: "Alertas",
      question: "Alertas",
      state: sectionState(lines),
      lines,
      source: "risk-alerts + dashboard.broker/runtime",
    });
  }

  return {
    id,
    type: MORNING_BRIEFING_TYPE,
    generatedAt,
    briefingDate,
    scheduleTimezone: MORNING_BRIEFING_TIMEZONE,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    title: `Morning Briefing — ${briefingDate}`,
    subtitle: `Pre-open briefing (${MORNING_BRIEFING_TIMEZONE}) · ANALYSIS_ONLY`,
    sections,
    sourcesUsed,
    note:
      sourcesUsed.length === 0
        ? "NO_DATA — no upstream snapshots available; PDF still generated for history."
        : `Assembled from: ${sourcesUsed.join(", ")}. Missing fields marked NO_DATA. ANALYSIS_ONLY.`,
  };
}
