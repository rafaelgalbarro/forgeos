/** Executive board digest — summary only, no chain-of-thought. */

import type { Mission } from "../types";
import type { ExecutiveDigest } from "./types";
import { getExecutiveCouncilSnapshot } from "../adapters/executive-mesh-adapter";

export function generateExecutiveDigest(mission: Mission): ExecutiveDigest {
  const council = getExecutiveCouncilSnapshot(mission);
  const boardSummary = mission.executiveBoard?.summary;

  if (boardSummary) {
    return {
      headline: boardSummary.headline,
      recommendation: boardSummary.finalRecommendation,
      risks: boardSummary.risks.slice(0, 4),
      confidence: boardSummary.confidence,
      departments: mission.executiveBoard?.reviews?.map((r) => r.department) ?? council.departments,
      generatedAt: new Date().toISOString(),
    };
  }

  const meshCouncil = mission.status.executiveCouncil;
  if (meshCouncil?.visible) {
    return {
      headline: meshCouncil.headline,
      recommendation: meshCouncil.summary,
      risks: mission.status.risks.slice(0, 4),
      confidence: meshCouncil.confidence,
      departments: meshCouncil.departments,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    headline: council.headline,
    recommendation: council.summary,
    risks: mission.status.risks.slice(0, 4),
    confidence: council.confidence,
    departments: council.departments,
    generatedAt: new Date().toISOString(),
  };
}

export function formatExecutiveDigestText(digest: ExecutiveDigest): string {
  const risks =
    digest.risks.length > 0 ? `\nRiesgos: ${digest.risks.join("; ")}` : "";
  return `${digest.headline}\n${digest.recommendation}${risks}\nConfianza del consejo: ${digest.confidence}%`;
}
