/** ForgeOS Developer Skills — types (RC4.2). */

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

export type DeveloperProviderId = "github" | "gitlab" | "docker";

export interface DeveloperProject {
  id: string;
  name: string;
  provider: DeveloperProviderId;
  ventureId: string;
  status: "active" | "archived";
}

export interface DeveloperRepository {
  id: string;
  name: string;
  provider: DeveloperProviderId;
  projectId: string;
  defaultBranch: string;
  visibility: "public" | "private";
}

export interface DeveloperDeployment {
  id: string;
  provider: string;
  environment: "preview" | "staging" | "production";
  status: "pending" | "success" | "failed" | "rolled_back";
  url?: string;
}

export interface DeveloperContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "building";
  provider: "docker";
}
