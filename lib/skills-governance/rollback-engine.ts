/** ForgeOS Skills Governance — Rollback Engine (RC4.1). */

import { getSkillById } from "@/lib/skills/registry";
import type { RollbackPlan } from "./types";

export function buildRollbackPlan(skillId: string, action: string): RollbackPlan {
  const skill = getSkillById(skillId);
  const name = skill?.name ?? skillId;

  const steps = [
    `Snapshot pre-execution state for ${name}`,
    `Identify side effects of ${action}`,
    `Execute compensating transaction (sandbox mock)`,
    `Verify state consistency`,
    `Mark execution as rolled_back in audit log`,
  ];

  const recoveryPlan = [
    "Notify requesting department of rollback",
    "Escalate to Security if rollback fails",
    "Update venture timeline with rollback event",
    "Re-evaluate risk before retry",
  ];

  const compensationActions: string[] = [];
  if (/delete|destroy|purge/i.test(action)) {
    compensationActions.push("Restore from last known good snapshot (mock)");
  }
  if (/deploy|publish|release/i.test(action)) {
    compensationActions.push("Revert to previous deployment (mock)");
  }
  if (/create|write|update/i.test(action)) {
    compensationActions.push("Delete or revert created resources (mock)");
  }
  if (compensationActions.length === 0) {
    compensationActions.push("No state changes to compensate (read-only action)");
  }

  return { skillId, steps, recoveryPlan, compensationActions };
}

export function listRollbackPlans(): RollbackPlan[] {
  const samples = ["github", "vercel", "aws", "stripe", "google-docs"];
  return samples.map((id) => buildRollbackPlan(id, "sample_action"));
}
