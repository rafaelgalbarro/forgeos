/** Program 2035 — Proposal generation from observations. */

import type {
  ImprovementProposal,
  ObservationSignal,
  ProposalComplexity,
  ProposalPriority,
  ProposalRisk,
  RiskAssessment,
  TechnicalPlan,
  AffectedArea,
} from "./types";

const NOW = () => new Date().toISOString();

interface ProposalTemplate {
  observationMatch: (title: string) => boolean;
  title: string;
  description: string;
  impact: string;
  complexity: ProposalComplexity;
  risk: ProposalRisk;
  priority: ProposalPriority;
  costUsd: number;
  timeHours: number;
  roi: number;
  modules: string[];
  files: string[];
  tests: string[];
}

const TEMPLATES: ProposalTemplate[] = [
  {
    observationMatch: (t) => t.includes("Build lento"),
    title: "Optimizar pipeline de build",
    description:
      "Habilitar compilación incremental, analizar bundle y eliminar imports pesados para reducir build < 30s.",
    impact: "Reduce tiempo de desarrollo ~35% y mejora CI",
    complexity: "medium",
    risk: "low",
    priority: "high",
    costUsd: 0,
    timeHours: 6,
    roi: 4.8,
    modules: ["next.config", "lib/build"],
    files: ["next.config.ts", "package.json"],
    tests: ["npm run build < 30s", "Verificar HMR funcional", "CI pipeline green"],
  },
  {
    observationMatch: (t) => t.includes("duplicado"),
    title: "Consolidar KpiBlock y MetricCard",
    description: "Crear BaseMetricCard compartido y migrar usos duplicados.",
    impact: "Menos deuda técnica y mantenimiento unificado",
    complexity: "low",
    risk: "low",
    priority: "medium",
    costUsd: 0,
    timeHours: 4,
    roi: 3.2,
    modules: ["components/ui/fhis"],
    files: ["components/ui/fhis/KpiBlock.tsx", "components/ui/fhis/MetricCard.tsx"],
    tests: ["Snapshot tests FHIS", "Visual regression dashboard", "Storybook components"],
  },
  {
    observationMatch: (t) => t.includes("Ruta sin uso"),
    title: "Archivar o documentar ruta /lab/rc1",
    description: "Marcar como legacy, redirigir o documentar propósito histórico.",
    impact: "Reduce confusión y superficie de mantenimiento",
    complexity: "trivial",
    risk: "low",
    priority: "low",
    costUsd: 0,
    timeHours: 2,
    roi: 2.1,
    modules: ["app/lab/rc1"],
    files: ["app/lab/rc1/page.tsx", "app/os/labs/page.tsx"],
    tests: ["HTTP 200 o redirect", "Link en labs actualizado"],
  },
  {
    observationMatch: (t) => t.includes("Founder"),
    title: "Simplificar onboarding fundador a 3 pasos",
    description: "Fusionar pasos 2-3, añadir progreso visual y CTA claro.",
    impact: "Mejora conversión estimada +25%",
    complexity: "medium",
    risk: "medium",
    priority: "high",
    costUsd: 0,
    timeHours: 8,
    roi: 5.1,
    modules: ["components/launch", "lib/founder"],
    files: ["components/launch/OnboardingWizard.tsx"],
    tests: ["E2E founder journey", "Métricas dropoff", "A11y wizard"],
  },
];

function defaultTemplate(obs: ObservationSignal): ProposalTemplate {
  return {
    observationMatch: () => true,
    title: `Mejora: ${obs.title}`,
    description: obs.description,
    impact: "Mejora general del área afectada",
    complexity: "medium",
    risk: "medium",
    priority: obs.severity === "critical" ? "critical" : obs.severity === "warning" ? "high" : "medium",
    costUsd: 0,
    timeHours: 4,
    roi: 2.5,
    modules: [obs.affectedArea],
    files: [],
    tests: ["Regression suite", "Manual QA"],
  };
}

function findTemplate(obs: ObservationSignal): ProposalTemplate {
  return TEMPLATES.find((t) => t.observationMatch(obs.title)) ?? defaultTemplate(obs);
}

export function createProposalFromObservation(
  obs: ObservationSignal,
  index: number
): ImprovementProposal {
  const tpl = findTemplate(obs);
  const now = NOW();
  return {
    id: `prop-2035-${String(index + 1).padStart(3, "0")}`,
    title: tpl.title,
    description: tpl.description,
    impact: tpl.impact,
    complexity: tpl.complexity,
    risk: tpl.risk,
    priority: tpl.priority,
    estimatedCostUsd: tpl.costUsd,
    estimatedTimeHours: tpl.timeHours,
    roiScore: tpl.roi,
    affectedArea: obs.affectedArea as AffectedArea,
    status: index < 4 ? "proposed" : "draft",
    observationIds: [obs.id],
    createdAt: now,
    updatedAt: now,
    dryRun: true,
    requiresHumanApproval: true,
  };
}

export function createProposals(observations: ObservationSignal[]): ImprovementProposal[] {
  const critical = observations.filter(
    (o) =>
      o.severity === "warning" ||
      o.severity === "critical" ||
      o.title.includes("Build lento") ||
      o.title.includes("duplicado") ||
      o.title.includes("Ruta sin uso") ||
      o.title.includes("Founder")
  );
  return critical.map((obs, i) => createProposalFromObservation(obs, i));
}

export function createRiskAssessment(proposal: ImprovementProposal): RiskAssessment {
  const factors = [
    {
      label: "Impacto en producción",
      level: proposal.risk,
      mitigation: "Deploy en branch aislado con preview",
    },
    {
      label: "Regresión funcional",
      level: proposal.complexity === "high" ? "high" : ("low" as ProposalRisk),
      mitigation: "Suite de tests + QA manual",
    },
    {
      label: "Deuda técnica introducida",
      level: "low" as ProposalRisk,
      mitigation: "Code review obligatorio",
    },
  ];
  return {
    proposalId: proposal.id,
    overallRisk: proposal.risk,
    factors,
    rollbackPlan: `git revert en branch ${proposal.id} — sin merge a main sin aprobación`,
    dryRun: true,
  };
}

export function createTechnicalPlan(
  proposal: ImprovementProposal,
  tpl?: ProposalTemplate
): TechnicalPlan {
  const template = tpl ?? TEMPLATES.find((t) => t.title === proposal.title);
  return {
    proposalId: proposal.id,
    summary: proposal.description,
    affectedModules: template?.modules ?? [proposal.affectedArea],
    affectedFiles: template?.files ?? [],
    testChecklist: template?.tests ?? ["Regression suite"],
    rollbackSteps: [
      "Revertir commit en branch feature",
      "Verificar build green",
      "Notificar stakeholders",
    ],
    migrationNotes: proposal.complexity === "high" ? ["Migración gradual con feature flag"] : [],
    executionChecklist: [
      "Crear branch (dry-run)",
      "Implementar cambios",
      "Ejecutar tests",
      "Solicitar review",
      "Esperar aprobación humana",
      "Merge solo tras approval layer",
    ],
    dryRun: true,
  };
}
