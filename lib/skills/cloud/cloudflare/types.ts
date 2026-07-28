/** Cloudflare cloud skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const CLOUDFLARE_CONFIG: ProviderModuleConfig = {
  id: "cloudflare",
  name: "Cloudflare",
  category: "cicd",
  provider: "cloudflare",
  capability: "cdn_deploy",
  credential: "CLOUDFLARE_TOKEN",
  risks: ["external_api", "infra_change"],
  actions: [
    { id: "deploy_worker", name: "Deploy Worker", risk: "HIGH" },
    { id: "purge_cache", name: "Purge Cache", risk: "MEDIUM" },
    { id: "list_zones", name: "List Zones", risk: "LOW" },
    { id: "create_dns_record", name: "Create DNS Record", risk: "MEDIUM" },
  ],
  mockData: (action, ctx) => ({
    provider: "cloudflare",
    action,
    ventureId: ctx.ventureId,
    zone: `${ctx.ventureId}.forgeos.dev`,
    worker: action.includes("worker") ? { name: "forgeos-edge", status: "deployed" } : undefined,
    sandbox: true,
  }),
};

export type CloudflareAction = (typeof CLOUDFLARE_CONFIG.actions)[number]["id"];
