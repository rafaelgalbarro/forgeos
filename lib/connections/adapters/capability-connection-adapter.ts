/** ForgeOS Real Connections — capability → connection bridge (RC5). */

import type { CapabilityContext, CapabilityResolution } from "@/lib/capabilities/types";
import type {
  ConnectionProvider,
  ConnectionResult,
  RealConnectionCapability,
} from "../shared/types";
import { REAL_CONNECTION_CAPABILITIES } from "../shared/types";
import { defaultConnectionMode } from "../security/connection-policy";
import { githubAdapter } from "../github/adapter";
import { supabaseAdapter } from "../supabase/adapter";
import { vercelAdapter } from "../vercel/adapter";
import { cloudflareAdapter } from "../cloudflare/adapter";
import { redactObject } from "../security/secret-redaction";
import type { BaseConnectionAdapter } from "../shared/base-adapter";

const CAPABILITY_PROVIDER_MAP: Record<RealConnectionCapability, ConnectionProvider> = {
  create_repository: "github",
  create_branch: "github",
  open_pull_request: "github",
  prepare_release: "github",
  create_database: "supabase",
  create_environment: "vercel",
  deploy_software: "vercel",
  configure_domain: "cloudflare",
};

const CAPABILITY_OPERATION_MAP: Record<RealConnectionCapability, string> = {
  create_repository: "create_repository",
  create_branch: "create_branch",
  open_pull_request: "open_pull_request",
  prepare_release: "prepare_release",
  create_database: "create_database",
  create_environment: "create_environment",
  deploy_software: "deploy_software",
  configure_domain: "configure_domain",
};

const ADAPTERS: Record<ConnectionProvider, BaseConnectionAdapter> = {
  github: githubAdapter,
  supabase: supabaseAdapter,
  vercel: vercelAdapter,
  cloudflare: cloudflareAdapter,
};

export function isRealConnectionCapability(capabilityId: string): capabilityId is RealConnectionCapability {
  return (REAL_CONNECTION_CAPABILITIES as readonly string[]).includes(capabilityId);
}

export function resolveConnectionProvider(capabilityId: string): ConnectionProvider | null {
  if (!isRealConnectionCapability(capabilityId)) return null;
  return CAPABILITY_PROVIDER_MAP[capabilityId];
}

export function getConnectionAdapter(provider: ConnectionProvider): BaseConnectionAdapter {
  return ADAPTERS[provider];
}

export interface CapabilityConnectionInput {
  capabilityId: string;
  context: CapabilityContext;
  resolution: CapabilityResolution;
  mode?: "dry_run" | "sandbox" | "production";
  userConfirmed?: boolean;
}

export async function executeCapabilityConnection(
  input: CapabilityConnectionInput
): Promise<ConnectionResult | null> {
  const provider = resolveConnectionProvider(input.capabilityId);
  if (!provider) return null;

  const operation = CAPABILITY_OPERATION_MAP[input.capabilityId as RealConnectionCapability];
  const adapter = getConnectionAdapter(provider);
  const mode = input.mode ?? defaultConnectionMode();

  return adapter.run(operation, {
    ventureId: input.context.ventureId,
    requestedBy: input.context.requestedBy,
    approvedBy: input.context.approvedBy,
    mode,
    userConfirmed: input.userConfirmed ?? false,
    approvalGranted: input.resolution.approval.approved,
    riskAllowed: input.resolution.policy.sandboxOnly ? true : input.resolution.approval.approved,
    permissionValid: true,
    payload: {
      ...input.context.payload,
      action: input.context.action,
      capabilityId: input.capabilityId,
    },
  });
}

export function formatConnectionOutput(result: ConnectionResult): string {
  const safe = redactObject(result);
  const planSummary = safe.plan?.summary ?? "";
  return `[CONNECTION:${safe.provider}] ${safe.output}${planSummary ? ` — ${planSummary}` : ""}`;
}

export function listConnectedCapabilities(): Array<{
  capabilityId: RealConnectionCapability;
  provider: ConnectionProvider;
}> {
  return (Object.keys(CAPABILITY_PROVIDER_MAP) as RealConnectionCapability[]).map((capabilityId) => ({
    capabilityId,
    provider: CAPABILITY_PROVIDER_MAP[capabilityId],
  }));
}
