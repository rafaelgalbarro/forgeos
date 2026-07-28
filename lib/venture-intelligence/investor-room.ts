/** RC8 — Investor room / data room (heuristic, dry-run). */

import type { InvestorRoomResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { buildDueDiligenceChecklist } from "./due-diligence-engine";

export function buildInvestorRoom(inputs: VentureFinancialInputs): InvestorRoomResult {
  const dd = buildDueDiligenceChecklist(inputs);

  const sections = [
    {
      id: "ir-overview",
      title: "Resumen ejecutivo",
      status: inputs.monthsOperating >= 3 ? ("partial" as const) : ("missing" as const),
      documents: ["One-pager", "Pitch deck"],
    },
    {
      id: "ir-financials",
      title: "Finanzas",
      status: inputs.monthlyRevenue > 0 ? ("partial" as const) : ("missing" as const),
      documents: ["P&L", "Cash flow", "Proyecciones"],
    },
    {
      id: "ir-legal",
      title: "Legal y corporativo",
      status: "missing" as const,
      documents: ["Cap table", "Estatutos", "Contratos"],
    },
    {
      id: "ir-product",
      title: "Producto y tecnología",
      status: "partial" as const,
      documents: ["Demo", "Arquitectura", "Roadmap"],
    },
    {
      id: "ir-team",
      title: "Equipo",
      status: inputs.teamSize >= 3 ? ("partial" as const) : ("missing" as const),
      documents: ["Bios fundadores", "Plan de hiring"],
    },
  ];

  const statusWeight = { ready: 1, partial: 0.5, missing: 0 };
  const readinessPct = Math.round(
    (sections.reduce((s, sec) => s + statusWeight[sec.status], 0) / sections.length) * 100
  );

  const ddReady = dd.filter((d) => d.status === "ready").length;
  void ddReady;

  return {
    readinessPct,
    sections,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
