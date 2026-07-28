/** GitLab developer skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const GITLAB_CONFIG: ProviderModuleConfig = {
  id: "gitlab",
  name: "GitLab",
  category: "development",
  provider: "gitlab",
  capability: "repository_ops",
  credential: "GITLAB_TOKEN",
  risks: ["external_api", "code_change"],
  actions: [
    { id: "create_project", name: "Create Project", risk: "MEDIUM" },
    { id: "create_merge_request", name: "Create Merge Request", risk: "MEDIUM" },
    { id: "push_code", name: "Push Code", risk: "MEDIUM" },
    { id: "list_pipelines", name: "List Pipelines", risk: "LOW" },
    { id: "get_pipeline_status", name: "Get Pipeline Status", risk: "LOW" },
    { id: "run_pipeline", name: "Run Pipeline", risk: "HIGH" },
  ],
  mockData: (action, ctx) => ({
    provider: "gitlab",
    action,
    ventureId: ctx.ventureId,
    project: `forgeos/${ctx.ventureId}`,
    pipeline: action.includes("pipeline") ? { id: "pipe-001", status: "success" } : undefined,
    sandbox: true,
  }),
};

export type GitLabAction = (typeof GITLAB_CONFIG.actions)[number]["id"];
