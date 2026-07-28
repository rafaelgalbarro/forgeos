/** ForgeOS Platform — identifier generators. */

import type { PlatformId, VentureId } from "./types";

let platformCounter = 0;
let ventureCounter = 0;

export function createPlatformId(): PlatformId {
  platformCounter += 1;
  return `platform_${Date.now()}_${platformCounter}`;
}

export function createVentureId(prefix = "venture"): VentureId {
  ventureCounter += 1;
  return `${prefix}_${Date.now()}_${ventureCounter}`;
}

export function isVentureId(value: string): value is VentureId {
  return value.length > 0 && !value.includes(" ");
}
