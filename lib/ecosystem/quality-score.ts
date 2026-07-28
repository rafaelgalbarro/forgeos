/** RC9 — Quality score engine (heuristic / sandbox). */

import { getEcosystemPackById } from "./catalog";
import { ECOSYSTEM_SANDBOX_DISCLAIMER, type QualityScore } from "./types";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function scoreFromSeed(id: string, offset: number): number {
  const h = hashSeed(id + String(offset));
  return Math.round((3.5 + (h % 15) / 10) * 10) / 10;
}

export function computeQualityScore(packId: string): QualityScore {
  const pack = getEcosystemPackById(packId);
  const documentation = scoreFromSeed(packId, 1);
  const reliability = pack?.rating ?? scoreFromSeed(packId, 2);
  const security = scoreFromSeed(packId, 3);
  const community = pack ? Math.min(5, (pack.reviewCount ?? 0) / 30 + 3) : scoreFromSeed(packId, 4);
  const overall = Math.round(((documentation + reliability + security + community) / 4) * 10) / 10;
  return {
    packId,
    overall,
    documentation,
    reliability,
    security,
    community,
    disclaimer: ECOSYSTEM_SANDBOX_DISCLAIMER,
  };
}

export function rankPacksByQuality(packIds: string[]): QualityScore[] {
  return packIds.map(computeQualityScore).sort((a, b) => b.overall - a.overall);
}
