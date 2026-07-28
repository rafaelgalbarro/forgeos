/** ForgeOS Capability Layer — planner (RC4.9). */

import { getCapabilityById } from "./capability-registry";
import type { CapabilityExecutionPlan, CapabilityPlanStep, CapabilityResolution } from "./types";
import type { CapabilityRequest } from "./types";

const MULTI_SKILL_CAPABILITIES: Record<string, { skills: string[]; actions: string[] }> = {
  deploy_software: {
    skills: ["github", "docker", "vercel", "cloudflare", "supabase", "slack", "knowledge", "timeline", "memory"],
    actions: [
      "trigger_ci",
      "build_image",
      "deploy_preview",
      "configure_dns",
      "migrate_db",
      "notify_team",
      "update_knowledge",
      "record_timeline",
      "persist_memory",
    ],
  },
  publish_release: {
    skills: ["github", "vercel", "docker", "slack", "cloudflare"],
    actions: ["tag_release", "deploy_production", "push_image", "announce_release", "purge_cache"],
  },
  generate_frontend: {
    skills: ["github", "vercel", "openai-skill"],
    actions: ["scaffold_repo", "deploy_preview", "generate_components"],
  },
  generate_backend: {
    skills: ["github", "docker", "openai-skill"],
    actions: ["scaffold_api", "build_image", "generate_endpoints"],
  },
};

function buildSingleStepPlan(
  capabilityId: string,
  resolution: CapabilityResolution,
  action: string
): CapabilityExecutionPlan {
  const capability = getCapabilityById(capabilityId);
  const step: CapabilityPlanStep = {
    stepId: `step-${capabilityId}-0`,
    skillId: resolution.primarySkillId,
    provider: resolution.provider,
    action,
    dependsOn: [],
    order: 0,
    rollbackAction: `rollback_${action}`,
  };

  return {
    planId: crypto.randomUUID(),
    capabilityId,
    steps: [step],
    dependencies: {},
    order: [step.stepId],
    rollback: [`Revert ${action} via ${resolution.primarySkillId}`],
    recovery: [
      `Retry with fallback: ${resolution.fallbackSkillIds[0] ?? "none"}`,
      "Notify requesting department",
      "Escalate to CEO on repeated failure",
    ],
    approvalRequired: resolution.approval.required,
    estimatedDurationMs: capability?.estimatedLatency ?? 5000,
    estimatedCost: capability?.estimatedCost ?? 0.1,
  };
}

function buildMultiStepPlan(
  capabilityId: string,
  resolution: CapabilityResolution,
  config: { skills: string[]; actions: string[] }
): CapabilityExecutionPlan {
  const capability = getCapabilityById(capabilityId);
  const steps: CapabilityPlanStep[] = config.skills.map((skillId, i) => {
    const prevStepId = i > 0 ? `step-${capabilityId}-${i - 1}` : undefined;
    return {
      stepId: `step-${capabilityId}-${i}`,
      skillId,
      provider: skillId,
      action: config.actions[i] ?? resolution.capabilityId,
      dependsOn: prevStepId ? [prevStepId] : [],
      order: i,
      rollbackAction: `rollback_${config.actions[i] ?? "step"}`,
    };
  });

  const dependencies: Record<string, string[]> = {};
  for (const step of steps) {
    if (step.dependsOn.length) {
      dependencies[step.stepId] = [...step.dependsOn];
    }
  }

  const totalLatency = (capability?.estimatedLatency ?? 10000) + steps.length * 500;

  return {
    planId: crypto.randomUUID(),
    capabilityId,
    steps,
    dependencies,
    order: steps.map((s) => s.stepId),
    rollback: steps
      .slice()
      .reverse()
      .map((s) => `Rollback ${s.skillId}.${s.action}`),
    recovery: [
      "Pause pipeline and assess failed step",
      ...resolution.fallbackSkillIds.map((f) => `Fallback skill: ${f}`),
      "Notify deployment and CEO",
      "Restore last known good state",
    ],
    approvalRequired: resolution.approval.required,
    estimatedDurationMs: totalLatency,
    estimatedCost: (capability?.estimatedCost ?? 0.2) * steps.length * 0.3,
  };
}

export function planCapabilityExecution(
  request: CapabilityRequest,
  resolution: CapabilityResolution
): CapabilityExecutionPlan {
  const multi = MULTI_SKILL_CAPABILITIES[request.capabilityId];
  if (multi) {
    return buildMultiStepPlan(request.capabilityId, resolution, multi);
  }
  return buildSingleStepPlan(
    request.capabilityId,
    resolution,
    request.context.action
  );
}
