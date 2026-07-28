/** ForgeOS Capability Layer — validator (RC4.9). */

import { getCapabilityById } from "./capability-registry";
import { checkCapabilityPermission } from "./capability-permissions";
import type { CapabilityRequest } from "./types";

export interface CapabilityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCapabilityRequest(
  request: CapabilityRequest
): CapabilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.capabilityId?.trim()) {
    errors.push("capabilityId is required");
  }

  if (!request.context?.ventureId?.trim()) {
    errors.push("context.ventureId is required");
  }

  if (!request.context?.requestedBy) {
    errors.push("context.requestedBy is required");
  }

  if (!request.context?.action?.trim()) {
    errors.push("context.action is required");
  }

  const capability = getCapabilityById(request.capabilityId);
  if (!capability) {
    errors.push(`Capability ${request.capabilityId} not found in registry`);
    return { valid: false, errors, warnings };
  }

  const permission = checkCapabilityPermission(
    capability,
    request.context.requestedBy
  );
  if (!permission.allowed) {
    errors.push(...permission.violations);
  }

  if (request.preferredProvider && !capability.compatibleProviders.includes(request.preferredProvider)) {
    warnings.push(
      `Preferred provider ${request.preferredProvider} not in compatible list — resolver will override`
    );
  }

  if (request.preferredSkill && !capability.compatibleSkills.includes(request.preferredSkill)) {
    warnings.push(
      `Preferred skill ${request.preferredSkill} not in compatible list — resolver will override`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
