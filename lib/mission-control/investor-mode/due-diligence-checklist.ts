/** PROGRAM 5800 — Due diligence checklist generator. */

import type { DDChecklistItem, VentureIntelligenceContext } from "./types";
import type { Mission } from "../types";

export function generateDueDiligenceChecklist(
  mission: Mission,
  ctx: VentureIntelligenceContext
): DDChecklistItem[] {
  const items = ctx.dueDiligenceItems.length
    ? ctx.dueDiligenceItems
    : [
        { id: "dd-cap-table", category: "legal", label: "Cap table actualizado", status: "missing", priority: "high" },
        { id: "dd-financials", category: "finanzas", label: "Estados financieros (12 meses)", status: "missing", priority: "high" },
        { id: "dd-pitch", category: "inversión", label: "Pitch deck inversor", status: "missing", priority: "high" },
        { id: "dd-metrics", category: "métricas", label: "Dashboard de métricas SaaS", status: "missing", priority: "high" },
        { id: "dd-contracts", category: "legal", label: "Contratos clave y IP", status: "missing", priority: "medium" },
        { id: "dd-team", category: "equipo", label: "Organigrama y plan de hiring", status: "missing", priority: "medium" },
        { id: "dd-product", category: "producto", label: "Roadmap y demos", status: "missing", priority: "medium" },
        { id: "dd-gtm", category: "go-to-market", label: "Pipeline comercial", status: "missing", priority: "medium" },
        { id: "dd-compliance", category: "compliance", label: "RGPD y políticas", status: "missing", priority: "low" },
      ];

  const phaseBoost = ["VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"].includes(mission.phase);

  return items.map((item) => {
    let status = item.status as DDChecklistItem["status"];
    if (phaseBoost && item.id === "dd-pitch" && status === "missing") status = "partial";
    if (phaseBoost && item.id === "dd-product" && status === "missing") status = "partial";
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      status,
      priority: item.priority as DDChecklistItem["priority"],
      completed: status === "ready",
    };
  });
}
