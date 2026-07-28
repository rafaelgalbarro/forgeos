/**
 * PROGRAM 6100 — Measure composition root cold/warm init.
 */

import { createCompositionRoot, getCompositionRoot, resetCompositionRoot } from "@/src/core/composition";

export interface CompositionInitMetrics {
  coldInitMs: number;
  warmInitMs: number;
  servicesReady: boolean;
  serviceCount: number;
}

export function measureCompositionRootInit(): CompositionInitMetrics {
  resetCompositionRoot();
  const coldStart = performance.now();
  const cold = createCompositionRoot({ sandboxAvailable: false });
  const coldInitMs = performance.now() - coldStart;

  const warmStart = performance.now();
  const warm = getCompositionRoot();
  const warmInitMs = performance.now() - warmStart;

  return {
    coldInitMs,
    warmInitMs,
    servicesReady: Boolean(cold.application && warm.application),
    serviceCount: Object.keys(cold.serviceMap).length,
  };
}
