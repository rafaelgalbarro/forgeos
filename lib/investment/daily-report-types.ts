/**
 * Daily investment PDF report — types for gather + render pipeline.
 * ANALYSIS_ONLY: missing inputs → NO_DATA; never invent live P&L.
 */

import type { ReportEquityPoint, ReportMetricRow, ReportSection } from "@/lib/investment/reports-types";

export const DAILY_REPORT_NO_DATA = "NO_DATA" as const;

export type DailyReportSectionId =
  | "resumen_ejecutivo"
  | "estado_mercados"
  | "estado_cartera"
  | "rentabilidad"
  | "pnl"
  | "operaciones"
  | "nuevas_oportunidades"
  | "riesgos"
  | "alertas"
  | "noticias"
  | "calendario_macro"
  | "comite_ia"
  | "mejores_oportunidades"
  | "operaciones_recomendadas"
  | "operaciones_a_vigilar"
  | "posiciones_con_riesgo"
  | "resumen_manana";

export const DAILY_REPORT_SECTION_TITLES: Record<DailyReportSectionId, string> = {
  resumen_ejecutivo: "Resumen ejecutivo",
  estado_mercados: "Estado mercados",
  estado_cartera: "Estado cartera",
  rentabilidad: "Rentabilidad",
  pnl: "P&L",
  operaciones: "Operaciones",
  nuevas_oportunidades: "Nuevas oportunidades",
  riesgos: "Riesgos",
  alertas: "Alertas",
  noticias: "Noticias",
  calendario_macro: "Calendario macro",
  comite_ia: "Comité IA",
  mejores_oportunidades: "Mejores oportunidades",
  operaciones_recomendadas: "Operaciones recomendadas",
  operaciones_a_vigilar: "Operaciones a vigilar",
  posiciones_con_riesgo: "Posiciones con riesgo",
  resumen_manana: "Resumen para mañana",
};

export type DailyReportTable = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export type DailyReportHeatCell = {
  readonly label: string;
  readonly value: string;
  /** 0–1 intensity; null → NO_DATA gray */
  readonly intensity: number | null;
};

export type DailyReportRichSection = ReportSection & {
  readonly id: DailyReportSectionId;
  readonly table?: DailyReportTable;
  readonly heatmaps?: readonly DailyReportHeatCell[];
  readonly indicators?: readonly ReportMetricRow[];
  readonly aiConclusions?: readonly string[];
};

export type DailyReportGatherBundle = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly periodKey: string;
  readonly sourceSnapshots: readonly string[];
  readonly summaryMetrics: readonly ReportMetricRow[];
  readonly sections: readonly DailyReportRichSection[];
  readonly paperEquityCurve: readonly ReportEquityPoint[];
  readonly shadowEquityCurve: readonly ReportEquityPoint[];
  readonly comparative: {
    readonly paperPnl: string;
    readonly shadowPnl: string;
    readonly matchedCount: number;
    readonly compareRows: number;
    readonly note: string;
  };
  readonly aiExecutiveConclusions: readonly string[];
  readonly note: string;
};
