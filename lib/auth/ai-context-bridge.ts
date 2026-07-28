/** Program 3000 — Inject workspace into AI Runtime context (adapter only). */

import type { ContextV2Input } from "@/lib/ai-runtime/context-engine/v2";
import type { ActiveWorkspaceContext } from "@/lib/workspace/types";

export interface WorkspaceAiContextInput {
  workspaceId?: string;
  workspaceName?: string;
  organizationId?: string;
  organizationName?: string;
  userId?: string;
  ventureIds?: string[];
  preferences?: ActiveWorkspaceContext["preferences"];
}

export function mergeWorkspaceIntoAiContext(
  base?: ContextV2Input,
  workspace?: WorkspaceAiContextInput | null
): ContextV2Input | undefined {
  if (!workspace?.workspaceId) return base;

  const metadata = {
    ...(base?.metadata ?? {}),
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.workspaceName,
    organizationId: workspace.organizationId,
    organizationName: workspace.organizationName,
    userId: workspace.userId,
    ventureIds: workspace.ventureIds,
    aiOptimizer: workspace.preferences?.defaultOptimizer,
  };

  const workspaceBlock = [
    `Workspace: ${workspace.workspaceName} (${workspace.workspaceId})`,
    `Organization: ${workspace.organizationName}`,
    workspace.ventureIds?.length
      ? `Ventures in workspace: ${workspace.ventureIds.join(", ")}`
      : "No ventures linked yet.",
    "All AI execution MUST stay scoped to this active workspace.",
  ].join("\n");

  return {
    ...base,
    metadata,
    securityConstraints: [
      ...(base?.securityConstraints ?? []),
      "Do not access data outside the active workspace scope.",
    ],
    conversationHistory: base?.conversationHistory,
    architectureSummary: base?.architectureSummary
      ? `${base.architectureSummary}\n\n${workspaceBlock}`
      : workspaceBlock,
  };
}

export function workspaceContextFromActive(
  ctx: ActiveWorkspaceContext | null
): WorkspaceAiContextInput | null {
  if (!ctx) return null;
  return {
    workspaceId: ctx.workspaceId,
    workspaceName: ctx.workspaceName,
    organizationId: ctx.organizationId,
    organizationName: ctx.organizationName,
    userId: ctx.userId,
    ventureIds: ctx.ventureIds,
    preferences: ctx.preferences,
  };
}
