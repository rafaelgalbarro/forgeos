import type { CustomerHealthScore } from "./types";
import { computeCustomerHealth } from "./customer-health";
import { getNpsScore } from "./nps-engine";
import { getRetentionMetrics } from "./retention";
import { getActivationMetrics } from "./activation";
import { getExpansionMetrics } from "./expansion";
import { listDesignPartnerEvents } from "@/lib/design-partners/analytics";

export function computeSuccessScore(health?: CustomerHealthScore | null): number {
  const h = health ?? computeCustomerHealth();
  const nps = getNpsScore();
  const retention = getRetentionMetrics();
  const activation = getActivationMetrics();
  const expansion = getExpansionMetrics();
  const events = listDesignPartnerEvents().length;
  const engagementBonus = Math.min(15, events);

  const npsComponent = Math.max(0, Math.min(100, nps.score + 50));
  const composite = Math.round(
    h.score * 0.35 +
      npsComponent * 0.2 +
      retention.rate * 0.2 +
      activation.rate * 0.15 +
      expansion.rate * 0.05 +
      engagementBonus * 0.05
  );

  return Math.max(0, Math.min(100, composite));
}
