import type { BuildQueueItem } from "../types";

export function assessDeploymentReadiness(item: BuildQueueItem): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  if (!item.artifacts.find((a) => a.type === "Backend" && a.status !== "draft")) {
    blockers.push("Backend no generado");
  }
  if (!item.artifacts.find((a) => a.type === "Frontend" && a.status !== "draft")) {
    blockers.push("Frontend no generado");
  }
  if (!item.artifacts.find((a) => a.type === "Testing" && a.status !== "draft")) {
    blockers.push("Tests pendientes");
  }

  return { ready: blockers.length === 0, blockers };
}

export function getDeploymentTarget(): string {
  return "vercel-stub";
}
