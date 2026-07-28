import type { NpsResponse } from "./types";
import {
  listNpsResponses,
  submitNpsResponse,
  getSuccessDashboardData,
} from "@/lib/design-partners/success-dashboard";

export { listNpsResponses, submitNpsResponse };

export function getNpsScore(): ReturnType<typeof getSuccessDashboardData>["nps"] {
  return getSuccessDashboardData().nps;
}

export function getNpsBreakdown(responses: NpsResponse[] = listNpsResponses()): {
  promoters: number;
  passives: number;
  detractors: number;
} {
  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const passives = responses.length - promoters - detractors;
  return { promoters, passives, detractors };
}
