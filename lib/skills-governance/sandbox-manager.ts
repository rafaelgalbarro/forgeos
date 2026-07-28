/** ForgeOS Skills Governance — Sandbox Manager (RC4.1). */

import type { SandboxMode } from "./types";

export interface SandboxResult {
  mode: SandboxMode;
  isolated: boolean;
  networkAccess: boolean;
  realApiCalls: boolean;
  description: string;
}

const SANDBOX_CONFIG: Record<SandboxMode, SandboxResult> = {
  simulation: {
    mode: "simulation",
    isolated: true,
    networkAccess: false,
    realApiCalls: false,
    description: "Full simulation — no side effects",
  },
  dry_run: {
    mode: "dry_run",
    isolated: true,
    networkAccess: false,
    realApiCalls: false,
    description: "Dry run — validates request without execution",
  },
  sandbox: {
    mode: "sandbox",
    isolated: true,
    networkAccess: true,
    realApiCalls: false,
    description: "Sandbox environment — mock provider responses",
  },
  production: {
    mode: "production",
    isolated: false,
    networkAccess: true,
    realApiCalls: true,
    description: "Production — BLOCKED in RC4.1",
  },
};

export function resolveSandboxMode(
  requested?: SandboxMode,
  riskDefault?: SandboxMode
): SandboxMode {
  const mode = requested ?? riskDefault ?? "simulation";
  if (mode === "production") return "sandbox";
  return mode;
}

export function getSandboxConfig(mode: SandboxMode): SandboxResult {
  return SANDBOX_CONFIG[mode];
}

export function listSandboxResults(): SandboxResult[] {
  return Object.values(SANDBOX_CONFIG);
}
