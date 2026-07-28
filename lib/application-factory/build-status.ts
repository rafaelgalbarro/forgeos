/** Program 4500 — Pipeline build tracker. */

import type {
  AppProject,
  BuildPhase,
  BuildPhaseStatus,
  PipelineBuildStatus,
  BuildStatusEntry,
} from "./types";

const PHASES: { phase: BuildPhase; label: string }[] = [
  { phase: "scaffold", label: "Scaffold Next.js" },
  { phase: "database", label: "Base de datos Supabase" },
  { phase: "api", label: "API Routes" },
  { phase: "frontend", label: "Frontend" },
  { phase: "auth", label: "Autenticación" },
  { phase: "tests", label: "Tests" },
  { phase: "github", label: "GitHub" },
  { phase: "supabase", label: "Supabase Cloud" },
  { phase: "preview", label: "Preview navegable" },
  { phase: "deploy", label: "Deploy" },
];

export function createInitialBuildStatus(projectId: string): PipelineBuildStatus {
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
  status: PipelineBuildStatus,
  phase: BuildPhase,
  next: { status: BuildPhaseStatus; message: string; deployUrl?: string; githubRepo?: string; supabaseProject?: string }
): PipelineBuildStatus {
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
    supabaseProject: next.supabaseProject ?? status.supabaseProject,
  };
}

export function syncBuildStatusFromProject(project: AppProject): PipelineBuildStatus {
  let status = project.buildStatus ?? createInitialBuildStatus(project.id);
  const completedSteps = project.steps
    .filter((s) => s.status === "success" || s.status === "stub")
    .map((s) => s.id);

  if (completedSteps.includes("frontend")) {
    status = updateBuildPhase(status, "scaffold", { status: "success", message: "Scaffold Next.js generado" });
    status = updateBuildPhase(status, "frontend", { status: "success", message: `${project.frontend?.pages.length ?? 0} páginas definidas` });
  }
  if (completedSteps.includes("database")) {
    status = updateBuildPhase(status, "database", { status: "success", message: `${project.database?.tables.length ?? 0} tablas Supabase` });
  }
  if (completedSteps.includes("api")) {
    status = updateBuildPhase(status, "api", { status: "success", message: `${project.api?.routes.length ?? 0} rutas API` });
  }
  if (completedSteps.includes("auth")) {
    status = updateBuildPhase(status, "auth", { status: "success", message: "Auth Supabase configurado" });
  }
  if (completedSteps.includes("tests")) {
    status = updateBuildPhase(status, "tests", { status: "success", message: "Suite de tests generada" });
  }
  if (completedSteps.includes("github")) {
    status = updateBuildPhase(status, "github", {
      status: "stub",
      message: "Repositorio GitHub — estrategia cloud-foundation (dry-run)",
      githubRepo: `forgeos/${project.name.toLowerCase().replace(/\s+/g, "-")}`,
    });
  }
  if (completedSteps.includes("supabase")) {
    status = updateBuildPhase(status, "supabase", {
      status: "stub",
      message: "Supabase Cloud — entornos dev/preview/staging/prod (cloud-foundation)",
      supabaseProject: "forgeos-preview",
    });
  }
  if (completedSteps.includes("preview")) {
    status = updateBuildPhase(status, "preview", { status: "success", message: "Preview navegable disponible" });
  }
  if (completedSteps.includes("deploy")) {
    status = updateBuildPhase(status, "deploy", {
      status: "stub",
      message: "Deploy — conectar Vercel via /cloud (cloud-foundation)",
      deployUrl: `https://${project.id.slice(0, 8)}.vercel.app`,
    });
  }

  return status;
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

export function getBuildPhaseLabel(phase: BuildPhase): string {
  return PHASES.find((p) => p.phase === phase)?.label ?? phase;
}
