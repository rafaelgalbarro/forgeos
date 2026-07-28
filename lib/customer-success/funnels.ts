import type { FunnelStep } from "./types";
import { getJourneyFunnel } from "@/lib/design-partners/journey-tracker";

export function getConversionFunnels(): FunnelStep[] {
  const funnel = getJourneyFunnel();
  const top = funnel[0]?.count ?? 1;

  return funnel.map((step, i) => {
    const prev = i === 0 ? top : funnel[i - 1].count;
    const conversionRate = prev > 0 ? Math.round((step.count / prev) * 100) : 0;
    return {
      id: step.stage,
      label: step.label,
      count: step.count,
      conversionRate,
    };
  });
}

export function getPrimaryFunnel(): FunnelStep[] {
  const stages = ["landing", "register", "workspace", "venture", "analytics"];
  return getConversionFunnels().filter((s) => stages.includes(s.id));
}
