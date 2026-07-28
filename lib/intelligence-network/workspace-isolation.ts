/** Program 9000 — Workspace isolation enforcement. */

import type { WorkspaceContext } from "./types";

export function assertWorkspaceBoundary(
  sourceWorkspaceId: string,
  targetWorkspaceId: string
): { isolated: boolean; violation?: string } {
  if (sourceWorkspaceId === targetWorkspaceId) {
    return { isolated: true };
  }
  return {
    isolated: false,
    violation: "Acceso cruzado entre workspaces bloqueado",
  };
}

export function filterByWorkspace<T extends { workspaceId?: string }>(
  items: T[],
  workspaceId: string
): T[] {
  return items.filter((item) => !item.workspaceId || item.workspaceId === workspaceId);
}

export function createWorkspaceContext(
  ctx: Omit<WorkspaceContext, "workspaceId"> & { workspaceId?: string }
): WorkspaceContext {
  return {
    ...ctx,
    workspaceId: ctx.workspaceId ?? "default-workspace",
  };
}

export function enforceWorkspaceIsolation(ctx: WorkspaceContext): string[] {
  return [
    `Workspace aislado: ${ctx.workspaceId}`,
    "Sin lectura de datos de otros workspaces",
    "Solo agregados anonimizados visibles en red",
  ];
}
