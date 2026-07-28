/** Shared application layer — PROGRAM 6085 wires composition root (file-backed). */

import {
  getCompositionRoot,
  type CompositionRoot,
} from "@/src/core/composition";
import type { ApplicationLayer } from "@/src/core/application";

let override: ApplicationLayer | null = null;

export function getPresentationApplicationLayer(): ApplicationLayer {
  if (override) return override;
  return getCompositionRoot().application;
}

export function getPresentationCompositionRoot(): CompositionRoot {
  return getCompositionRoot();
}

export function setPresentationApplicationLayer(layer: ApplicationLayer | null): void {
  override = layer;
}
