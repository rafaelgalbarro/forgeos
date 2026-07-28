/** Program 6000 — Stripe adapter STUB (no real charges unless env keys) */

import { isStripeBillingEnabled } from "./config";
import type { CommercialPlanId, StripeCheckoutResult } from "./types";

export interface StripeCheckoutParams {
  orgId: string;
  planId: CommercialPlanId;
  interval?: "monthly" | "annual";
  successUrl?: string;
  cancelUrl?: string;
}

export async function createCheckoutSession(
  params: StripeCheckoutParams
): Promise<StripeCheckoutResult> {
  if (!isStripeBillingEnabled()) {
    return {
      ok: true,
      mode: "dry-run",
      sessionId: `dry_cs_${params.planId}_${Date.now()}`,
      message: `Dry-run: checkout simulado para plan ${params.planId}. Sin cargo real.`,
    };
  }

  return {
    ok: true,
    mode: "live",
    sessionId: `cs_live_stub_${params.planId}`,
    url: params.successUrl,
    message: "Stripe configurado — integración real pendiente de activación en producción.",
  };
}

export async function createBillingPortalSession(orgId: string): Promise<StripeCheckoutResult> {
  if (!isStripeBillingEnabled()) {
    return {
      ok: true,
      mode: "dry-run",
      message: `Dry-run: portal de facturación simulado para ${orgId}.`,
    };
  }

  return {
    ok: true,
    mode: "live",
    url: "/billing",
    message: "Portal Stripe stub — redirige a billing local.",
  };
}

export function getStripeMode(): "dry-run" | "live" {
  return isStripeBillingEnabled() ? "live" : "dry-run";
}
