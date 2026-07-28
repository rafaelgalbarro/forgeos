/** Vercel cloud skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const VERCEL_CONFIG: ProviderModuleConfig = {
  id: "vercel",
  name: "Vercel",
  category: "cicd",
  provider: "vercel",
  capability: "deploy",
  credential: "VERCEL_TOKEN",
  risks: ["external_api", "infra_change"],
  actions: [
    { id: "deploy_preview", name: "Deploy Preview", risk: "MEDIUM" },
    { id: "deploy_production", name: "Deploy Production", risk: "HIGH" },
    { id: "list_deployments", name: "List Deployments", risk: "LOW" },
    { id: "rollback_deployment", name: "Rollback Deployment", risk: "HIGH" },
    { id: "get_deployment_status", name: "Get Deployment Status", risk: "LOW" },
  ],
  mockData: (action, ctx) => ({
    provider: "vercel",
    action,
    ventureId: ctx.ventureId,
    deployment: {
      id: `dpl-${Date.now()}`,
      url: `https://${ctx.ventureId}.vercel.app`,
      state: action.includes("rollback") ? "rolled_back" : "READY",
    },
    sandbox: true,
  }),
};

export type VercelAction = (typeof VERCEL_CONFIG.actions)[number]["id"];
