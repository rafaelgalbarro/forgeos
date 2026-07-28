/** PROGRAM 4400 — Website Build Status tracker. */

import type { BuildPhase, BuildPhaseStatus, BuildStatus, BuildStatusEntry, WebsiteProject } from "./types";

const PHASES: { phase: BuildPhase; label: string }[] = [
  { phase: "scaffold", label: "Scaffold Next.js" },
  { phase: "styling", label: "Tailwind + shadcn/ui" },
  { phase: "components", label: "Componentes" },
  { phase: "preview", label: "Preview local" },
  { phase: "github", label: "GitHub" },
  { phase: "deploy", label: "Deploy Preview" },
];

export function createInitialBuildStatus(projectId: string): BuildStatus {
  const now = new Date().toISOString();
  const entries: BuildStatusEntry[] = PHASES.map(({ phase, label }) => ({
    phase,
    label,
    status: "idle",
    message: "Pendiente",
    updatedAt: now,
  }));
  return { projectId, entries, overallPercent: 0 };
}

export function updateBuildPhase(
  status: BuildStatus,
  phase: BuildPhase,
  next: { status: BuildPhaseStatus; message: string; deployUrl?: string; githubRepo?: string }
): BuildStatus {
  const entries = status.entries.map((e) =>
    e.phase === phase
      ? { ...e, status: next.status, message: next.message, updatedAt: new Date().toISOString() }
      : e
  );
  const completed = entries.filter((e) => e.status === "success" || e.status === "stub").length;
  return {
    ...status,
    entries,
    overallPercent: Math.round((completed / entries.length) * 100),
    deployUrl: next.deployUrl ?? status.deployUrl,
    githubRepo: next.githubRepo ?? status.githubRepo,
  };
}

export function syncBuildStatusFromProject(project: WebsiteProject): BuildStatus {
  let status = project.buildStatus ?? createInitialBuildStatus(project.id);
  const stepOrder = project.steps.filter((s) => s.status === "completed").map((s) => s.id);

  if (stepOrder.includes("nextjs")) {
    status = updateBuildPhase(status, "scaffold", { status: "success", message: "Scaffold Next.js generado" });
  }
  if (stepOrder.includes("tailwind") || stepOrder.includes("shadcn")) {
    status = updateBuildPhase(status, "styling", { status: "success", message: "Estilos y UI configurados" });
  }
  if (stepOrder.includes("components")) {
    status = updateBuildPhase(status, "components", { status: "success", message: `${project.components.length} componentes definidos` });
  }
  if (stepOrder.includes("preview")) {
    status = updateBuildPhase(status, "preview", { status: "success", message: "Preview HTML disponible" });
  }
  if (stepOrder.includes("github")) {
    status = updateBuildPhase(status, "github", {
      status: "stub",
      message: "Repositorio GitHub — preparación (dry-run)",
      githubRepo: `forgeos/${project.name.toLowerCase().replace(/\s+/g, "-")}`,
    });
  }
  if (stepOrder.includes("deploy-preview")) {
    status = updateBuildPhase(status, "deploy", {
      status: "stub",
      message: "Deploy Preview — conectar Vercel via Cloud Foundation",
      deployUrl: `https://${project.id.slice(0, 8)}.vercel.app`,
    });
  }

  return status;
}

export function getBuildPhaseLabel(phase: BuildPhase): string {
  return PHASES.find((p) => p.phase === phase)?.label ?? phase;
}

export function statusLabelEs(status: BuildPhaseStatus): string {
  const map: Record<BuildPhaseStatus, string> = {
    idle: "Pendiente",
    running: "En curso",
    success: "Completado",
    error: "Error",
    stub: "Preparación",
  };
  return map[status];
}
