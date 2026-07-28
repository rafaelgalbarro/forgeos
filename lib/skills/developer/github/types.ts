/** GitHub developer skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";
import type { SkillContext } from "@/lib/skills/types";

export const GITHUB_CONFIG: ProviderModuleConfig = {
  id: "github",
  name: "GitHub",
  category: "development",
  provider: "github",
  capability: "repository_ops",
  credential: "GITHUB_TOKEN",
  risks: ["external_api", "code_change"],
  actions: [
    { id: "create_repository", name: "Create Repository", risk: "MEDIUM" },
    { id: "clone_repository", name: "Clone Repository", risk: "LOW" },
    { id: "push_code", name: "Push Code", risk: "MEDIUM" },
    { id: "create_pull_request", name: "Create Pull Request", risk: "MEDIUM" },
    { id: "merge_pull_request", name: "Merge Pull Request", risk: "HIGH" },
    { id: "list_repositories", name: "List Repositories", risk: "LOW" },
    { id: "get_workflow_status", name: "Get Workflow Status", risk: "LOW" },
  ],
  mockData: (action, ctx) => ({
    provider: "github",
    action,
    ventureId: ctx.ventureId,
    repository: `forgeos-${ctx.ventureId}`,
    branch: "main",
    pullRequest: action.includes("pull") ? { number: 42, state: "open" } : undefined,
    workflow: action.includes("workflow") ? { status: "completed", conclusion: "success" } : undefined,
    sandbox: true,
  }),
};

export type GitHubAction = (typeof GITHUB_CONFIG.actions)[number]["id"];
