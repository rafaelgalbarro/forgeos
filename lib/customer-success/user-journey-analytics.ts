import { getJourneyFunnel, getJourneyProgress, STAGE_LABELS } from "@/lib/design-partners/journey-tracker";
import type { JourneyStage } from "./types";

export { getJourneyFunnel, getJourneyProgress, STAGE_LABELS };
export type { JourneyStage };

export function getJourneyAnalytics(): {
  funnel: ReturnType<typeof getJourneyFunnel>;
  current: ReturnType<typeof getJourneyProgress>;
  completionRate: number;
} {
  const funnel = getJourneyFunnel();
  const current = getJourneyProgress();
  const started = funnel.find((s) => s.stage === "landing")?.count ?? 0;
  const completed = funnel.find((s) => s.stage === "analytics")?.count ?? 0;
  const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;

  return { funnel, current, completionRate };
}
