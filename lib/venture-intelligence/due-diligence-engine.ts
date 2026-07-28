/** RC8 — Due diligence engine (heuristic, dry-run). */

import type { DueDiligenceItem, InvestorReadinessResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

const CHECKLIST_TEMPLATE: Omit<DueDiligenceItem, "status">[] = [
  { id: "dd-cap-table", category: "legal", label: "Cap table actualizado", priority: "high" },
  { id: "dd-financials", category: "finanzas", label: "Estados financieros (12 meses)", priority: "high" },
  { id: "dd-pitch", category: "inversión", label: "Pitch deck inversor", priority: "high" },
  { id: "dd-metrics", category: "métricas", label: "Dashboard de métricas SaaS", priority: "high" },
  { id: "dd-contracts", category: "legal", label: "Contratos clave y IP", priority: "medium" },
  { id: "dd-team", category: "equipo", label: "Organigrama y plan de hiring", priority: "medium" },
  { id: "dd-product", category: "producto", label: "Roadmap y demos", priority: "medium" },
  { id: "dd-gtm", category: "go-to-market", label: "Pipeline comercial", priority: "medium" },
  { id: "dd-compliance", category: "compliance", label: "RGPD y políticas", priority: "low" },
];

function inferStatus(
  item: Omit<DueDiligenceItem, "status">,
  inputs: VentureFinancialInputs
): DueDiligenceItem["status"] {
  if (inputs.ventureId === LAB_MOCK_VENTURE_ID) {
    if (["dd-financials", "dd-pitch", "dd-metrics", "dd-team"].includes(item.id)) {
      return "ready";
    }
    if (["dd-product", "dd-gtm", "dd-contracts", "dd-compliance", "dd-cap-table"].includes(item.id)) {
      return "partial";
    }
    return "missing";
  }

  if (item.id === "dd-metrics" && inputs.monthlyRevenue > 0) return "partial";
  if (item.id === "dd-pitch" && inputs.monthsOperating >= 6) return "partial";
  if (item.id === "dd-team" && inputs.teamSize >= 3) return "partial";
  if (item.id === "dd-financials" && inputs.monthsOperating >= 12) return "partial";
  if (item.id === "dd-product" && inputs.monthsOperating >= 6) return "partial";
  if (item.id === "dd-gtm" && inputs.customerCount && inputs.customerCount >= 20) return "partial";
  if (item.id === "dd-cap-table" && inputs.monthsOperating >= 12) return "partial";
  return "missing";
}

export function buildDueDiligenceChecklist(inputs: VentureFinancialInputs): DueDiligenceItem[] {
  return CHECKLIST_TEMPLATE.map((item) => ({
    ...item,
    status: inferStatus(item, inputs),
  }));
}

export function assessInvestorReadiness(inputs: VentureFinancialInputs): InvestorReadinessResult {
  const checklist = buildDueDiligenceChecklist(inputs);
  const statusWeight = { ready: 1, partial: 0.5, missing: 0 };
  const score = Math.round(
    (checklist.reduce((s, i) => s + statusWeight[i.status], 0) / checklist.length) * 100
  );

  const gaps = checklist
    .filter((i) => i.status !== "ready")
    .filter((i) => i.priority === "high")
    .map((i) => i.label);

  const recommendedNextStep =
    gaps.length > 0 ? "preparar data room" : "iniciar outreach a inversores";

  return {
    score,
    checklist,
    gaps,
    recommendedNextStep,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
