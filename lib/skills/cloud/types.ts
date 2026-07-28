/** ForgeOS Cloud Skills — types (RC4.2). */

export type {
  ProviderActionDef,
  ProviderModuleConfig,
  ProviderPermissions,
  ProviderPolicies,
  ProviderTelemetryMeta,
  ProviderAuditEvent,
  ProviderSandboxConfig,
  ProviderSkillModule,
} from "@/lib/skills/shared/provider-factory";

export type CloudProviderId = "vercel" | "cloudflare" | "supabase" | "aws" | "azure" | "gcp";

export interface CloudResource {
  id: string;
  name: string;
  provider: CloudProviderId;
  type: string;
  region: string;
  status: "active" | "provisioning" | "failed" | "deleted";
}

export interface CloudDeployment {
  id: string;
  provider: CloudProviderId;
  service: string;
  environment: "preview" | "staging" | "production";
  status: "pending" | "live" | "failed" | "rolled_back";
  url?: string;
}
