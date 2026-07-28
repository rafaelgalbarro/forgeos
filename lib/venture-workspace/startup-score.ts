import type { VentureProject } from "@/lib/domain/venture";
import { formatStartupScore, formatVentureScore, resolveScores } from "@/lib/portfolio/venture-status";
import type { ScoreDisplay } from "@/lib/portfolio/types";

export interface WorkspaceScores {
  startupScore: ScoreDisplay;
  ventureScore: ScoreDisplay;
  confidenceLabel: string;
  rawStartup: number;
  rawVenture: number | null;
}

export function resolveWorkspaceScores(venture: VentureProject): WorkspaceScores {
  const scores = resolveScores(venture);
  return {
    startupScore: formatStartupScore(scores.startupScore),
    ventureScore: formatVentureScore(scores.ventureScore, scores.hasSimulation),
    confidenceLabel: scores.confidence.charAt(0).toUpperCase() + scores.confidence.slice(1),
    rawStartup: scores.startupScore,
    rawVenture: scores.ventureScore,
  };
}
