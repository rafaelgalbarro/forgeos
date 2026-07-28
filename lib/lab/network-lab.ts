/** RC10 — ForgeOS Network lab harness. */

import {
  runNetworkEngine,
  createDefaultNetworkContext,
  NETWORK_ENGINE_VERSION,
  listConsentScopes,
  getPrivacyChecklist,
  createDemoAnonymizedSample,
  grantAllConsent,
} from "@/lib/network";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import type { NetworkLabSnapshot } from "@/lib/network/types";

export function runNetworkLab(
  organizationId = "demo-org-forgeos",
  ventureId = LAB_MOCK_VENTURE_ID
): NetworkLabSnapshot {
  const ctx = createDefaultNetworkContext({
    organizationId,
    ventureId,
    ventureName: "FleetPulse Lab",
    sector: "saas",
    pricingPlanEur: 29,
    mrrGrowthPct: 12,
  });

  grantAllConsent(organizationId);

  const snapshot = runNetworkEngine(ctx);

  return {
    organizationId,
    ventureId,
    engineVersion: NETWORK_ENGINE_VERSION,
    consentScopes: listConsentScopes(),
    snapshot,
    privacyChecks: getPrivacyChecklist(),
    anonymizationSample: createDemoAnonymizedSample(ctx.sector),
  };
}

export function validateNetworkConsent(
  organizationId: string,
  scope: string
): { valid: boolean; hint?: string } {
  const scopes = listConsentScopes();
  if (!scopes.includes(scope as (typeof scopes)[number])) {
    return { valid: false, hint: `Ámbito desconocido: ${scope}` };
  }
  return { valid: true };
}
