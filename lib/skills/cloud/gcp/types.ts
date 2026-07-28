/** GCP cloud skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const GCP_CONFIG: ProviderModuleConfig = {
  id: "gcp",
  name: "GCP",
  category: "cloud",
  provider: "google",
  capability: "cloud_ops",
  credential: "GCP_SERVICE_ACCOUNT",
  risks: ["cloud_cost", "infra_change"],
  actions: [
    { id: "deploy_cloud_run", name: "Deploy Cloud Run", risk: "HIGH" },
    { id: "create_storage_bucket", name: "Create Storage Bucket", risk: "MEDIUM" },
    { id: "list_services", name: "List Services", risk: "LOW" },
    { id: "delete_resource", name: "Delete Resource", risk: "CRITICAL" },
  ],
  mockData: (action, ctx) => ({
    provider: "google",
    action,
    ventureId: ctx.ventureId,
    project: `forgeos-${ctx.ventureId}`,
    region: "europe-west1",
    sandbox: true,
  }),
};

export type GcpAction = (typeof GCP_CONFIG.actions)[number]["id"];
