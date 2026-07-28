/** ForgeOS Platform — central pillar registry (no cross-pillar logic). */

import type { PillarDescriptor, PillarId } from "./types";

const pillars = new Map<PillarId, PillarDescriptor>();

export function registerPillar(pillar: PillarDescriptor): void {
  pillars.set(pillar.id, pillar);
}

export function getPillar(id: PillarId): PillarDescriptor | undefined {
  return pillars.get(id);
}

export function listPillars(): PillarDescriptor[] {
  return Array.from(pillars.values());
}

export function clearPillarRegistry(): void {
  pillars.clear();
}
