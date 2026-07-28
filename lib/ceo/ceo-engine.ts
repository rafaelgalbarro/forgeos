import type { VentureProject } from "@/lib/domain/venture";
import type { BoardEngineOutput } from "@/lib/board";
import { getDefaultBoardQuestion, runBoardEngine } from "@/lib/board";
import type { FosSnapshot } from "@/lib/fos";
import {
  buildMorningBrief,
  buildWeeklyReview,
  buildMonthlyReview,
  type MorningBrief,
  type WeeklyReview,
  type MonthlyReview,
} from "./daily-briefing";
import { buildCeoExecutiveSummary, type CeoExecutiveSummary } from "./executive-summary";
import { recordBriefing } from "./memory";
import { identifyTopOpportunities, type TopOpportunity } from "./opportunity-engine";
import { resolveCeoTopPriority, type CeoPriorityItem } from "./priority";
import { buildCeoRecommendation, type CeoRecommendation } from "./recommendation-engine";
import { analyzeCriticalRisks, type CriticalRisk } from "./risk-analysis";
import { reviewAllVentures, type VentureReview } from "./venture-review";

export interface CeoEngineOutput {
  morningBrief: MorningBrief;
  weeklyReview: WeeklyReview;
  monthlyReview: MonthlyReview;
  executiveSummary: CeoExecutiveSummary;
  criticalRisks: CriticalRisk[];
  topOpportunities: TopOpportunity[];
  topPriority: CeoPriorityItem | null;
  recommendation: CeoRecommendation;
  ventureReviews: VentureReview[];
  board: BoardEngineOutput;
  computedAt: string;
}

export function runCeoEngine(
  ventures: VentureProject[],
  fos: FosSnapshot
): CeoEngineOutput {
  const boardQuestion = getDefaultBoardQuestion(ventures);
  const board = runBoardEngine(boardQuestion, ventures);

  const output: CeoEngineOutput = {
    morningBrief: buildMorningBrief(ventures, fos),
    weeklyReview: buildWeeklyReview(ventures, fos),
    monthlyReview: buildMonthlyReview(ventures, fos),
    executiveSummary: buildCeoExecutiveSummary(ventures, fos),
    criticalRisks: analyzeCriticalRisks(ventures),
    topOpportunities: identifyTopOpportunities(ventures),
    topPriority: resolveCeoTopPriority(ventures),
    recommendation: buildCeoRecommendation(ventures),
    ventureReviews: reviewAllVentures(ventures),
    board,
    computedAt: new Date().toISOString(),
  };

  recordBriefing(fos);
  return output;
}
