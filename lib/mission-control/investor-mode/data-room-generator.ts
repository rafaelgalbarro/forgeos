/** PROGRAM 5800 — Data room document index generator. */

import type { DataRoomDoc, VentureIntelligenceContext } from "./types";
import type { Mission } from "../types";

const CATEGORY_DOCS: Array<Omit<DataRoomDoc, "status">> = [
  { id: "dr-exec-summary", category: "legal", title: "Resumen ejecutivo", description: "One-pager y visión de venture", priority: "high" },
  { id: "dr-cap-table", category: "legal", title: "Cap table", description: "Estructura accionarial y vesting", priority: "high" },
  { id: "dr-incorporation", category: "legal", title: "Estatutos y constitución", description: "Documentos corporativos", priority: "high" },
  { id: "dr-contracts", category: "legal", title: "Contratos clave", description: "IP, clientes y proveedores", priority: "medium" },
  { id: "dr-pl", category: "financial", title: "P&L (12 meses)", description: "Cuenta de resultados", priority: "high" },
  { id: "dr-cashflow", category: "financial", title: "Cash flow", description: "Flujo de caja proyectado", priority: "high" },
  { id: "dr-fin-model", category: "financial", title: "Modelo financiero 3 años", description: "Proyecciones de ingresos y burn", priority: "high" },
  { id: "dr-metrics", category: "financial", title: "Dashboard métricas SaaS", description: "MRR, churn, CAC, LTV", priority: "medium" },
  { id: "dr-prd", category: "product", title: "PRD y roadmap", description: "Requisitos y plan de producto", priority: "high" },
  { id: "dr-architecture", category: "product", title: "Arquitectura técnica", description: "Diagramas y stack tecnológico", priority: "medium" },
  { id: "dr-demo", category: "product", title: "Demo y screenshots", description: "Producto en funcionamiento", priority: "medium" },
  { id: "dr-competitive", category: "product", title: "Análisis competitivo", description: "Landscape y diferenciación", priority: "medium" },
  { id: "dr-founder-bios", category: "team", title: "Bios fundadores", description: "CV y track record", priority: "high" },
  { id: "dr-org-chart", category: "team", title: "Organigrama", description: "Estructura actual y plan hiring", priority: "medium" },
  { id: "dr-advisors", category: "team", title: "Advisors y board", description: "Consejeros y mentores", priority: "low" },
];

function inferStatus(
  doc: Omit<DataRoomDoc, "status">,
  mission: Mission,
  ctx: VentureIntelligenceContext
): DataRoomDoc["status"] {
  const phaseIdx = ["UNDERSTAND", "PLAN", "BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"].indexOf(mission.phase);

  const roomSection = ctx.investorRoomSections.find((s) =>
    s.documents.some((d) => d.toLowerCase().includes(doc.title.split(" ")[0].toLowerCase()))
  );
  if (roomSection?.status === "ready") return "ready";
  if (roomSection?.status === "partial") return "partial";

  const dd = ctx.dueDiligenceItems.find((d) => d.label.toLowerCase().includes(doc.title.toLowerCase().slice(0, 8)));
  if (dd?.status === "ready") return "ready";
  if (dd?.status === "partial") return "partial";

  if (doc.id === "dr-exec-summary" && phaseIdx >= 2) return "partial";
  if (doc.id === "dr-prd" && phaseIdx >= 3) return "partial";
  if (doc.id === "dr-architecture" && phaseIdx >= 4) return "partial";
  if (doc.id === "dr-fin-model" && phaseIdx >= 5) return "partial";
  if (doc.id === "dr-demo" && phaseIdx >= 4) return "partial";
  if (doc.id === "dr-founder-bios" && phaseIdx >= 1) return "partial";

  return "missing";
}

export function generateDataRoom(mission: Mission, ctx: VentureIntelligenceContext): DataRoomDoc[] {
  return CATEGORY_DOCS.map((doc) => ({
    ...doc,
    status: inferStatus(doc, mission, ctx),
  }));
}
