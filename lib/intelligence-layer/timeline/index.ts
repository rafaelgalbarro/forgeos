import type { VentureProject } from "@/lib/domain/venture";
import type { Decision, TimelineNode, TimelinePhase } from "../types";

const PHASE_LABELS: Record<TimelinePhase, string> = {
  idea: "Idea",
  discovery: "Discovery",
  research: "Research",
  simulator: "Simulador",
  product: "Producto",
  build: "Build",
  launch: "Lanzamiento",
  growth: "Crecimiento",
};

function node(
  phase: TimelinePhase,
  date: string,
  impact: string,
  responsible: string
): TimelineNode {
  return {
    phase,
    label: PHASE_LABELS[phase],
    date,
    impact,
    responsible,
  };
}

export function buildVentureTimeline(
  venture: VentureProject,
  decisions: Decision[]
): TimelineNode[] {
  const nodes: TimelineNode[] = [];

  nodes.push(
    node("idea", venture.createdAt, "Inicio del venture", "founder")
  );

  if (venture.intelligenceAccepted) {
    nodes.push(
      node("idea", venture.updatedAt, "Inteligencia aceptada", "founder")
    );
  }

  const discoveryCount = venture.discoveryContext?.answers.length ?? 0;
  if (discoveryCount > 0) {
    nodes.push(
      node(
        "discovery",
        venture.updatedAt,
        `${discoveryCount} decisiones aclaradas`,
        "founder"
      )
    );
  }

  if (venture.researchReport) {
    nodes.push(
      node("research", venture.updatedAt, "Research de mercado", "founder")
    );
  }

  if (venture.ventureSimulatorResult) {
    const s = venture.ventureSimulatorResult;
    nodes.push(
      node(
        "simulator",
        venture.updatedAt,
        `Score ${s.startupScore}/100 — ${s.recommendationLabel}`,
        "founder"
      )
    );
  }

  if (venture.productPRD) {
    nodes.push(
      node("product", venture.updatedAt, venture.name, "founder")
    );
  }

  const hasBuild = venture.sections.some(
    (s) =>
      ["arquitectura", "backend", "frontend", "build-plan"].includes(s.id) &&
      s.content.trim().length > 0
  );
  if (hasBuild) {
    nodes.push(node("build", venture.updatedAt, "Plan de construcción", "founder"));
  }

  if (venture.status === "ready") {
    nodes.push(node("launch", venture.updatedAt, "Venture listo", "founder"));
  }

  for (const d of decisions) {
    if (d.status === "completed" && !nodes.some((n) => n.impact === d.title)) {
      nodes.push({
        phase: "growth",
        label: d.title,
        date: d.date,
        impact: d.expectedImpact,
        responsible: d.takenBy,
      });
    }
  }

  return nodes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
