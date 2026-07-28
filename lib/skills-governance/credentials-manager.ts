/** ForgeOS Skills Governance — Credentials Manager (RC4.1, sandbox only). */

import { getSkillById } from "@/lib/skills/registry";

export interface CredentialStatus {
  skillId: string;
  required: string[];
  resolved: boolean;
  source: "sandbox-mock" | "vault" | "missing";
  expiresAt?: string;
}

const MOCK_CREDENTIALS: Record<string, string> = {
  "api-key": "sk-sandbox-mock-****",
  "oauth-token": "oauth-sandbox-mock-****",
  "service-account": "sa-sandbox-mock-****",
  webhook_secret: "whsec-sandbox-mock-****",
};

export function resolveCredentials(skillId: string): CredentialStatus {
  const skill = getSkillById(skillId);
  const required = skill?.requiredCredentials ?? [];

  if (required.length === 0) {
    return { skillId, required: [], resolved: true, source: "sandbox-mock" };
  }

  const allResolved = required.every((c) => MOCK_CREDENTIALS[c] !== undefined || c.includes("optional"));

  return {
    skillId,
    required,
    resolved: allResolved,
    source: allResolved ? "sandbox-mock" : "missing",
    expiresAt: allResolved ? new Date(Date.now() + 3600000).toISOString() : undefined,
  };
}

export function listCredentialStatuses(skillIds: string[]): CredentialStatus[] {
  return skillIds.map(resolveCredentials);
}

export function getMockCredential(key: string): string | undefined {
  return MOCK_CREDENTIALS[key];
}
