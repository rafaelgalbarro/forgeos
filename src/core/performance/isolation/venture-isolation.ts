/**
 * PROGRAM 6100 — Multi-venture resource isolation guards.
 */

export interface IsolationContext {
  workspaceId: string;
  ventureId?: string;
  missionId?: string;
  projectId?: string;
  sandboxId?: string;
  executionId?: string;
}

export class IsolationViolationError extends Error {
  readonly code = "ISOLATION_VIOLATION";
  constructor(message: string) {
    super(message);
    this.name = "IsolationViolationError";
  }
}

export function assertVentureAccess(
  resourceVentureId: string,
  context: IsolationContext,
): void {
  if (context.ventureId && resourceVentureId !== context.ventureId) {
    throw new IsolationViolationError(
      `Venture isolation: resource belongs to ${resourceVentureId}, context is ${context.ventureId}`,
    );
  }
}

export function assertMissionAccess(
  resourceMissionId: string,
  resourceVentureId: string,
  context: IsolationContext,
): void {
  assertVentureAccess(resourceVentureId, context);
  if (context.missionId && resourceMissionId !== context.missionId) {
    throw new IsolationViolationError(
      `Mission isolation: resource belongs to ${resourceMissionId}, context is ${context.missionId}`,
    );
  }
}

export function assertWorkspaceAccess(
  resourceWorkspaceId: string,
  context: IsolationContext,
): void {
  if (resourceWorkspaceId !== context.workspaceId) {
    throw new IsolationViolationError(
      `Workspace isolation: resource belongs to ${resourceWorkspaceId}, context is ${context.workspaceId}`,
    );
  }
}

export function scopeCacheKey(context: IsolationContext, id: string): string {
  return [
    context.workspaceId,
    context.ventureId || "_",
    context.missionId || "_",
    id,
  ].join(":");
}

export function canAccessArtifact(
  artifact: { ventureId: string; missionId?: string },
  context: IsolationContext,
): boolean {
  try {
    assertVentureAccess(artifact.ventureId, context);
    if (context.missionId && artifact.missionId && artifact.missionId !== context.missionId) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
