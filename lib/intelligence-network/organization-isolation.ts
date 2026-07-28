/** Program 9000 — Organization isolation enforcement. */

import { verifyOrgIsolation } from "@/lib/network/privacy-layer";
import type { NetworkContext } from "@/lib/network/types";

export function assertOrgBoundary(
  sourceOrgId: string,
  targetOrgId: string
): { isolated: boolean; violation?: string } {
  if (verifyOrgIsolation(sourceOrgId, targetOrgId)) {
    return { isolated: true };
  }
  return {
    isolated: false,
    violation: "Mezcla de datos entre organizaciones prohibida",
  };
}

export function enforceOrganizationIsolation(ctx: NetworkContext): string[] {
  return [
    `Organización aislada: ${ctx.organizationId}`,
    "Sin exposición de datos crudos cross-org",
    "Contribuciones solo con consentimiento explícito",
  ];
}

export function canAccessOrgData(
  requesterOrgId: string,
  dataOrgId: string
): boolean {
  return requesterOrgId === dataOrgId;
}
