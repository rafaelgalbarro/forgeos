/** PROGRAM 5150 — Mission plan generator (PLAN phase, heuristic/demo). */

import type { MissionSession, MissionStage, MissionPhase } from "./types";

export interface MissionPlanResult {
  stages: MissionStage[];
  summary: string;
}

const PLAN_DOMAINS: Array<{
  id: string;
  label: string;
  owner: string;
  department: string;
  deps: string[];
  minutes: number;
  approval: boolean;
  result: string;
}> = [
  { id: "research", label: "Research", owner: "CEO", department: "Strategy", deps: [], minutes: 60, approval: false, result: "Informe de mercado y tendencias" },
  { id: "market", label: "Análisis de mercado", owner: "CMO", department: "Marketing", deps: ["research"], minutes: 45, approval: false, result: "TAM/SAM y segmentos" },
  { id: "competitors", label: "Competidores", owner: "CEO", department: "Strategy", deps: ["research"], minutes: 30, approval: false, result: "Mapa competitivo" },
  { id: "value_prop", label: "Propuesta de valor", owner: "CEO", department: "Product", deps: ["market", "competitors"], minutes: 30, approval: true, result: "Value prop diferenciada" },
  { id: "icp", label: "ICP", owner: "CMO", department: "Marketing", deps: ["market"], minutes: 25, approval: false, result: "Perfil de cliente ideal" },
  { id: "business_model", label: "Modelo de negocio", owner: "CFO", department: "Finance", deps: ["value_prop"], minutes: 40, approval: true, result: "Unit economics preliminares" },
  { id: "pricing", label: "Pricing", owner: "CFO", department: "Finance", deps: ["business_model"], minutes: 30, approval: true, result: "Estructura de precios" },
  { id: "prd", label: "PRD", owner: "CPO", department: "Product", deps: ["value_prop", "icp"], minutes: 90, approval: true, result: "PRD MVP" },
  { id: "architecture", label: "Arquitectura", owner: "CTO", department: "Engineering", deps: ["prd"], minutes: 60, approval: true, result: "Diagrama y stack" },
  { id: "database", label: "Base de datos", owner: "CTO", department: "Engineering", deps: ["architecture"], minutes: 45, approval: false, result: "Esquema inicial" },
  { id: "apis", label: "APIs", owner: "CTO", department: "Engineering", deps: ["architecture"], minutes: 40, approval: false, result: "Contratos API" },
  { id: "frontend", label: "Frontend", owner: "CTO", department: "Engineering", deps: ["prd", "architecture"], minutes: 60, approval: false, result: "Wireframes y componentes" },
  { id: "backend", label: "Backend", owner: "CTO", department: "Engineering", deps: ["database", "apis"], minutes: 60, approval: false, result: "Servicios core" },
  { id: "website", label: "Website", owner: "CMO", department: "Marketing", deps: ["value_prop"], minutes: 30, approval: false, result: "Landing preview" },
  { id: "application", label: "Aplicación", owner: "CTO", department: "Engineering", deps: ["frontend", "backend"], minutes: 90, approval: true, result: "App preview" },
  { id: "mobile_readiness", label: "Mobile readiness", owner: "CTO", department: "Engineering", deps: ["application"], minutes: 20, approval: false, result: "Evaluación móvil" },
  { id: "qa", label: "QA", owner: "QA Lead", department: "Quality", deps: ["application"], minutes: 45, approval: false, result: "Plan de pruebas" },
  { id: "security", label: "Seguridad", owner: "CTO", department: "Security", deps: ["architecture"], minutes: 30, approval: true, result: "Checklist seguridad" },
  { id: "deployment_preview", label: "Deployment preview", owner: "CTO", department: "DevOps", deps: ["application", "security"], minutes: 30, approval: true, result: "Plan sandbox" },
  { id: "gtm", label: "GTM", owner: "CMO", department: "Marketing", deps: ["pricing", "website"], minutes: 45, approval: true, result: "Plan de lanzamiento" },
  { id: "metrics", label: "Métricas", owner: "CEO", department: "Strategy", deps: ["gtm"], minutes: 20, approval: false, result: "KPIs north-star" },
  { id: "capital_readiness", label: "Capital readiness", owner: "CFO", department: "Finance", deps: ["business_model", "metrics"], minutes: 30, approval: false, result: "Readiness inversores" },
];

export function generateMissionPlan(session: MissionSession): MissionPlanResult {
  const idea = session.intent?.extractedIdea ?? "Misión";
  const stages: MissionStage[] = PLAN_DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    phase: "PLAN" as MissionPhase,
    owner: d.owner,
    department: d.department,
    dependencies: d.deps,
    status: d.deps.length === 0 ? "completed" : "pending",
    expectedResult: d.result,
    estimatedMinutes: d.minutes,
    approvalRequired: d.approval,
    approved: !d.approval,
  }));

  const approvalCount = stages.filter((s) => s.approvalRequired).length;
  const totalMinutes = stages.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return {
    stages,
    summary: `Plan para "${idea.slice(0, 50)}" — ${stages.length} etapas, ${approvalCount} aprobaciones, ~${Math.round(totalMinutes / 60)}h estimadas`,
  };
}

export function planProgress(stages: MissionStage[]): number {
  if (!stages.length) return 0;
  const done = stages.filter((s) => s.status === "completed").length;
  return Math.round((done / stages.length) * 100);
}
