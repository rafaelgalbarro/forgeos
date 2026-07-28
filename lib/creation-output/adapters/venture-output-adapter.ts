/** PROGRAM 5350 — Venture output adapter (Venture Factory / E2E). */

import type { CreationOutput, VentureOutputPayload } from "../types";
import { createOutputId } from "../output-registry";

export interface VentureAdapterInput {
  missionId: string;
  ventureId: string;
  ventureSlug: string;
  ventureName: string;
  ideaText: string;
}

export async function buildVentureOutput(input: VentureAdapterInput): Promise<CreationOutput> {
  const { resolveVentureFixture } = await import("@/lib/venture-e2e/fixture-registry");
  const fixture = resolveVentureFixture(input.ventureSlug);
  const venture = fixture?.venture;
  const now = new Date().toISOString();

  const intel = venture?.intelligenceReport;
  const prd = venture?.productPRD;

  const payload: VentureOutputPayload = {
    name: venture?.name ?? input.ventureName,
    valueProposition: prd?.executiveSummary ?? intel?.founderAdvisor?.summary ?? input.ideaText,
    icp: venture?.targetAudience ?? intel?.targetAudience ?? "B2B",
    market: intel?.market?.tamEstimate ?? "Mercado en análisis",
    businessModel: intel?.businessModel?.recommended ?? intel?.recommendedBusinessModel ?? "SaaS",
    pricing: intel?.businessModel?.revenueMechanism ?? "Suscripción mensual",
    brand: {
      primaryColor: "#2563eb",
      tone: "profesional",
      tagline: intel?.founderAdvisor?.headline,
    },
    roadmap: [
      { phase: "MVP", items: ["Core features", "Onboarding", "Dashboard"] },
      { phase: "Beta", items: ["Integraciones", "Analytics", "Mobile"] },
      { phase: "Launch", items: ["GTM", "Pricing", "Support"] },
    ],
    kpis: [
      { label: "MRR objetivo", value: "€5k", trend: "+15%" },
      { label: "Usuarios activos", value: "50", trend: "+8" },
      { label: "NPS", value: "42", trend: "+3" },
      { label: "Churn", value: "3.2%", trend: "-0.5%" },
    ],
    financialSummary: `Proyección demo basada en ${intel?.market?.tamEstimate ?? "mercado objetivo"}. Sin datos reales.`,
    investorReadiness: { score: intel?.startupScore ?? 65, label: "Demo readiness" },
    launchReadiness: { score: 58, label: "Preview — no launch real" },
    orgStructure: [
      { role: "CEO / Founder", responsibility: "Estrategia y fundraising" },
      { role: "CTO", responsibility: "Producto y arquitectura" },
      { role: "Head of Sales", responsibility: "GTM y revenue" },
    ],
    executiveSummary:
      prd?.executiveSummary ??
      intel?.founderAdvisor?.summary ??
      `${input.ventureName}: ${input.ideaText}`,
    linkedOutputs: {},
  };

  return {
    outputId: createOutputId("VENTURE_OUTPUT"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    type: "VENTURE_OUTPUT",
    title: `${payload.name} — Company Room`,
    status: "PREVIEW_READY",
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    sourceArtifacts: [
      { artifactId: `art-venture-${input.ventureId}`, type: "venture", label: "Venture Project" },
    ],
    previewMode: "mock",
    files: [],
    routes: [{ id: "company-room", path: "/company", label: "Company Room" }],
    screenshots: [],
    validation: undefined,
    approvals: [],
    warnings: [
      { id: "w-venture-demo", severity: "info", message: "Datos demo — no producción", code: "PREVIEW_SAFETY" },
    ],
    nextActions: [
      { id: "na-approve", label: "Aprobar empresa", kind: "approve" },
      { id: "na-export", label: "Exportar resumen", kind: "export" },
    ],
    payload,
  };
}
