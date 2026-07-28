/**
 * ForgeOS Platform — minimal root export.
 * Exports shared contracts and pillar registry metadata only.
 * NOT wired into app routes — isolated lib module.
 */

export {
  PLATFORM_VERSION,
  PLATFORM_NAME,
  PILLAR_NAMES,
  PILLAR_VERSIONS,
  PILLAR_DESCRIPTIONS,
  registerPillar,
  getPillar,
  listPillars,
  clearPillarRegistry,
  createPlatformId,
  createVentureId,
  createPlatformEventBus,
  PlatformError,
  PillarNotReadyError,
  PillarNotFoundError,
} from "./shared";

export type {
  PlatformId,
  VentureId,
  PillarId,
  PillarStatus,
  PillarDescriptor,
  PillarCapability,
  PillarEngine,
  PlatformContext,
  PlatformEvent,
  PlatformEventBus,
} from "./shared";

import type { PillarDescriptor, PillarId } from "./shared/types";
import {
  PILLAR_DESCRIPTIONS,
  PILLAR_NAMES,
  PILLAR_VERSIONS,
  registerPillar,
} from "./shared";

import { listStrategyCapabilities } from "./strategy/registry";
import { listProductCapabilities } from "./product/registry";
import { listBuildCapabilities } from "./build/registry";
import { listLaunchCapabilities } from "./launch/registry";
import { listGrowthCapabilities } from "./growth/registry";
import { listCeoCapabilities } from "./ceo/registry";
import { listStudioCapabilities } from "./studio/registry";
import { listIntelligenceCapabilities } from "./intelligence/registry";
import { listCapitalCapabilities } from "./capital/registry";

const CAPABILITY_LOADERS: Record<PillarId, () => PillarDescriptor["capabilities"]> = {
  strategy: listStrategyCapabilities,
  product: listProductCapabilities,
  build: listBuildCapabilities,
  launch: listLaunchCapabilities,
  growth: listGrowthCapabilities,
  ceo: listCeoCapabilities,
  studio: listStudioCapabilities,
  intelligence: listIntelligenceCapabilities,
  capital: listCapitalCapabilities,
};

const PILLAR_IDS: PillarId[] = [
  "strategy",
  "product",
  "build",
  "launch",
  "growth",
  "ceo",
  "studio",
  "intelligence",
  "capital",
];

/** Register all pillar descriptors in the central registry (idempotent). */
export function bootstrapPlatformRegistry(): PillarDescriptor[] {
  const descriptors: PillarDescriptor[] = PILLAR_IDS.map((id) => ({
    id,
    name: PILLAR_NAMES[id],
    version: PILLAR_VERSIONS[id],
    description: PILLAR_DESCRIPTIONS[id],
    status: "scaffold",
    capabilities: CAPABILITY_LOADERS[id](),
  }));

  for (const descriptor of descriptors) {
    registerPillar(descriptor);
  }

  return descriptors;
}

export const PLATFORM_PILLAR_IDS = PILLAR_IDS;
