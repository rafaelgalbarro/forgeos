/** ForgeOS Capability Layer — resolver (auto-resolve, never manual) (RC4.9). */

import { getCapabilityById } from "./capability-registry";
import { getCapabilityPolicy } from "./capability-policies";
import { checkCapabilityPermission } from "./capability-permissions";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { CapabilityDefinition, CapabilityRequest, CapabilityResolution } from "./types";

const SKILL_FALLBACKS: Record<string, string[]> = {
  github: ["gitlab", "bitbucket"],
  vercel: ["netlify", "cloudflare"],
  "openai-skill": ["claude-skill", "gemini-skill"],
  supabase: ["postgres", "neon"],
  docker: ["github"],
};

const PROVIDER_PRIORITY: Record<string, number> = {
  github: 10,
  vercel: 9,
  docker: 8,
  supabase: 7,
  cloudflare: 6,
  openai: 5,
  anthropic: 4,
  notion: 3,
  slack: 2,
};

function pickPrimarySkill(
  capability: CapabilityDefinition,
  request: CapabilityRequest
): string {
  if (
    request.preferredSkill &&
    capability.compatibleSkills.includes(request.preferredSkill)
  ) {
    return request.preferredSkill;
  }
  return capability.compatibleSkills[0] ?? "github";
}

function pickProvider(
  capability: CapabilityDefinition,
  skillId: string,
  request: CapabilityRequest
): string {
  if (
    request.preferredProvider &&
    capability.compatibleProviders.includes(request.preferredProvider)
  ) {
    return request.preferredProvider;
  }

  const ranked = [...capability.compatibleProviders].sort(
    (a, b) => (PROVIDER_PRIORITY[b] ?? 0) - (PROVIDER_PRIORITY[a] ?? 0)
  );

  const skillMatch = ranked.find(
    (p) => p === skillId || skillId.includes(p) || p.includes(skillId.split("-")[0] ?? "")
  );
  return skillMatch ?? ranked[0] ?? skillId;
}

function buildFallbacks(primarySkill: string, capability: CapabilityDefinition): string[] {
  const fromMap = SKILL_FALLBACKS[primarySkill] ?? [];
  const fromRegistry = capability.compatibleSkills.filter((s) => s !== primarySkill);
  return [...new Set([...fromMap, ...fromRegistry])].slice(0, 5);
}

function resolveApproval(
  capability: CapabilityDefinition,
  policy: ReturnType<typeof getCapabilityPolicy>,
  requestedBy: CapabilityRequest["context"]["requestedBy"],
  approvedBy?: CapabilityRequest["context"]["approvedBy"]
): CapabilityResolution["approval"] {
  const permission = checkCapabilityPermission(capability, requestedBy);
  const required = policy.requireApproval || capability.risk === "critical";

  if (!required) {
    return {
      required: false,
      approved: true,
      approvers: [],
      rationale: "No approval required for this capability",
      signature: "auto-approved",
    };
  }

  const approvers: MeshDepartmentId[] = permission.requiredApprovers.length
    ? [...permission.requiredApprovers]
    : (["ceo"] as MeshDepartmentId[]);

  const approved = Boolean(approvedBy && approvers.includes(approvedBy));

  return {
    required: true,
    approved: approved || requestedBy === "ceo",
    approvers: [...approvers],
    rationale: approved
      ? `Approved by ${approvedBy}`
      : requestedBy === "ceo"
        ? "CEO self-approval"
        : "Awaiting CEO approval — sandbox auto-approves for demo",
    signature: approved || requestedBy === "ceo" ? `sig-${Date.now()}` : "",
  };
}

export function resolveCapability(request: CapabilityRequest): CapabilityResolution {
  const capability = getCapabilityById(request.capabilityId);
  if (!capability) {
    const denyPolicy = getCapabilityPolicy({
      id: request.capabilityId,
      name: request.capabilityId,
      category: "development",
      description: "",
      authorizedDepartments: [],
      compatibleWorkers: [],
      compatibleSkills: [],
      compatibleProviders: [],
      risk: "critical",
      estimatedCost: 0,
      estimatedLatency: 0,
      priority: "normal",
      version: "0",
      health: "unavailable",
      status: "disabled",
    });

    return {
      capabilityId: request.capabilityId,
      primarySkillId: "none",
      provider: "none",
      policy: denyPolicy,
      approval: {
        required: true,
        approved: false,
        approvers: ["ceo"],
        rationale: "Unknown capability — denied",
        signature: "",
      },
      fallbackSkillIds: [],
      sandboxMode: true,
      rationale: `Capability ${request.capabilityId} not in registry`,
    };
  }

  const policy = getCapabilityPolicy(capability);
  const primarySkillId = pickPrimarySkill(capability, request);
  const provider = pickProvider(capability, primarySkillId, request);
  const fallbackSkillIds = buildFallbacks(primarySkillId, capability);
  const approval = resolveApproval(
    capability,
    policy,
    request.context.requestedBy,
    request.context.approvedBy
  );

  return {
    capabilityId: capability.id,
    primarySkillId,
    provider,
    policy,
    approval,
    fallbackSkillIds,
    sandboxMode: policy.sandboxOnly,
    rationale: [
      `Auto-resolved ${capability.name}`,
      `Primary skill: ${primarySkillId}`,
      `Provider: ${provider}`,
      `Policy: ${policy.id}`,
      approval.required
        ? `Approval: ${approval.approved ? "granted" : "pending (sandbox granted)"}`
        : "Approval: not required",
      `Fallbacks: ${fallbackSkillIds.join(", ") || "none"}`,
      "Sandbox: enforced — no real API calls",
    ].join(". "),
  };
}
