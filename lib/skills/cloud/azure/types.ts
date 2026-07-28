/** Azure cloud skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const AZURE_CONFIG: ProviderModuleConfig = {
  id: "azure",
  name: "Azure",
  category: "cloud",
  provider: "microsoft",
  capability: "cloud_ops",
  credential: "AZURE_SUBSCRIPTION_KEY",
  risks: ["cloud_cost", "infra_change"],
  actions: [
    { id: "create_resource_group", name: "Create Resource Group", risk: "MEDIUM" },
    { id: "deploy_function", name: "Deploy Function", risk: "HIGH" },
    { id: "list_resources", name: "List Resources", risk: "LOW" },
    { id: "delete_resource", name: "Delete Resource", risk: "CRITICAL" },
  ],
  mockData: (action, ctx) => ({
    provider: "microsoft",
    action,
    ventureId: ctx.ventureId,
    subscription: "sub-mock-001",
    resourceId: `az-mock-${action}`,
    sandbox: true,
  }),
};

export type AzureAction = (typeof AZURE_CONFIG.actions)[number]["id"];
