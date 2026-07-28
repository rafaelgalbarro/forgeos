/**
 * PROGRAM 6100 — Concurrency guard with configurable limits.
 */

import { readConcurrencyLimits, type ConcurrencyLimits } from "../config/concurrency-limits";

export type ExecutionCategory =
  | "GLOBAL"
  | "WORKSPACE"
  | "VENTURE"
  | "AI"
  | "CODE_BUILD"
  | "PREVIEW"
  | "DEPLOYMENT";

interface ActiveExecution {
  id: string;
  category: ExecutionCategory;
  workspaceId: string;
  ventureId?: string;
  startedAt: string;
}

const activeExecutions = new Map<string, ActiveExecution>();

export function canStartExecution(
  category: ExecutionCategory,
  context: { workspaceId: string; ventureId?: string },
  limits: ConcurrencyLimits = readConcurrencyLimits(),
): { allowed: boolean; reason?: string } {
  const counts = countByCategory(context);
  switch (category) {
    case "GLOBAL":
      if (counts.global >= limits.MAX_GLOBAL_EXECUTIONS) {
        return { allowed: false, reason: "MAX_GLOBAL_EXECUTIONS reached" };
      }
      break;
    case "WORKSPACE":
      if (counts.workspace >= limits.MAX_WORKSPACE_EXECUTIONS) {
        return { allowed: false, reason: "MAX_WORKSPACE_EXECUTIONS reached" };
      }
      break;
    case "VENTURE":
      if (counts.venture >= limits.MAX_VENTURE_EXECUTIONS) {
        return { allowed: false, reason: "MAX_VENTURE_EXECUTIONS reached" };
      }
      break;
    case "AI":
      if (counts.ai >= limits.MAX_AI_EXECUTIONS) {
        return { allowed: false, reason: "MAX_AI_EXECUTIONS reached" };
      }
      break;
    case "CODE_BUILD":
      if (counts.codeBuild >= limits.MAX_CODE_BUILDS) {
        return { allowed: false, reason: "MAX_CODE_BUILDS reached" };
      }
      break;
    case "PREVIEW":
      if (counts.preview >= limits.MAX_PREVIEW_SANDBOXES) {
        return { allowed: false, reason: "MAX_PREVIEW_SANDBOXES reached" };
      }
      break;
    case "DEPLOYMENT":
      if (counts.deployment >= limits.MAX_DEPLOYMENT_EXECUTIONS) {
        return { allowed: false, reason: "MAX_DEPLOYMENT_EXECUTIONS reached" };
      }
      break;
  }
  return { allowed: true };
}

export function startExecution(
  id: string,
  category: ExecutionCategory,
  context: { workspaceId: string; ventureId?: string },
): { started: boolean; reason?: string } {
  const check = canStartExecution(category, context);
  if (!check.allowed) return { started: false, reason: check.reason };
  activeExecutions.set(id, {
    id,
    category,
    workspaceId: context.workspaceId,
    ventureId: context.ventureId,
    startedAt: new Date().toISOString(),
  });
  return { started: true };
}

export function endExecution(id: string): void {
  activeExecutions.delete(id);
}

export function cancelExecution(id: string): boolean {
  return activeExecutions.delete(id);
}

function countByCategory(context: { workspaceId: string; ventureId?: string }) {
  let global = 0;
  let workspace = 0;
  let venture = 0;
  let ai = 0;
  let codeBuild = 0;
  let preview = 0;
  let deployment = 0;
  for (const exec of activeExecutions.values()) {
    global += 1;
    if (exec.workspaceId === context.workspaceId) workspace += 1;
    if (context.ventureId && exec.ventureId === context.ventureId) venture += 1;
    if (exec.category === "AI") ai += 1;
    if (exec.category === "CODE_BUILD") codeBuild += 1;
    if (exec.category === "PREVIEW") preview += 1;
    if (exec.category === "DEPLOYMENT") deployment += 1;
  }
  return { global, workspace, venture, ai, codeBuild, preview, deployment };
}

export function getActiveExecutionCount(): number {
  return activeExecutions.size;
}

export function resetExecutions(): void {
  activeExecutions.clear();
}
