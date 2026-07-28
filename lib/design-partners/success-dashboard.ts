import type { NpsResponse, SuccessDashboardData } from "./types";
import { readStorage, writeStorage } from "./storage";
import { getJourneyFunnel } from "./journey-tracker";
import { trackDesignPartnerEvent } from "./analytics";

const NPS_KEY = "forgeos-dp-nps";

let memoryNps: NpsResponse[] = [];

function readNps(): NpsResponse[] {
  if (typeof window === "undefined") return memoryNps;
  const stored = readStorage<NpsResponse[]>(NPS_KEY, []);
  memoryNps = stored;
  return memoryNps;
}

function writeNps(responses: NpsResponse[]): void {
  memoryNps = responses;
  writeStorage(NPS_KEY, responses);
}

export function listNpsResponses(): NpsResponse[] {
  return readNps();
}

export function submitNpsResponse(input: {
  score: number;
  comment?: string;
  userId?: string;
  workspaceId?: string;
}): NpsResponse {
  const response: NpsResponse = {
    id: `nps-${Date.now()}`,
    score: Math.max(0, Math.min(10, input.score)),
    comment: input.comment?.trim(),
    userId: input.userId,
    workspaceId: input.workspaceId,
    createdAt: new Date().toISOString(),
  };
  writeNps([...readNps(), response]);
  trackDesignPartnerEvent({
    event: "dp_nps_submit",
    userId: input.userId,
    workspaceId: input.workspaceId,
    meta: { score: String(response.score) },
  });
  return response;
}

function computeNps(responses: NpsResponse[]): SuccessDashboardData["nps"] {
  if (responses.length === 0) {
    return { score: 0, responses: 0, promoters: 0, detractors: 0 };
  }
  const promoters = responses.filter((r) => r.score >= 9).length;
  const detractors = responses.filter((r) => r.score <= 6).length;
  const score = Math.round(((promoters - detractors) / responses.length) * 100);
  return { score, responses: responses.length, promoters, detractors };
}

function computeRetention(): SuccessDashboardData["retention"] {
  const funnel = getJourneyFunnel();
  const started = funnel.find((s) => s.stage === "landing")?.count ?? 0;
  const returning = funnel.find((s) => s.stage === "analytics")?.count ?? 0;
  const cohortSize = Math.max(started, 1);
  const rate = Math.round((returning / cohortSize) * 100);
  return { rate, cohortSize: started, returningUsers: returning };
}

function computeActivation(): SuccessDashboardData["activation"] {
  const funnel = getJourneyFunnel();
  const started = funnel.find((s) => s.stage === "register")?.count ?? 0;
  const completed = funnel.find((s) => s.stage === "venture")?.count ?? 0;
  const denom = Math.max(started, 1);
  const rate = Math.round((completed / denom) * 100);
  return { rate, started, completed };
}

export function getSuccessDashboardData(): SuccessDashboardData {
  return {
    nps: computeNps(readNps()),
    retention: computeRetention(),
    activation: computeActivation(),
    journeyFunnel: getJourneyFunnel(),
  };
}
