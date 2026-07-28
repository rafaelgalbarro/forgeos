import { getSharedEventBus } from "@/lib/fos";
import type { FosMetrics } from "@/lib/fos";

let lastMetrics: FosMetrics | null = null;
let initialized = false;

export function initPortfolioFosBridge(): void {
  if (initialized) return;
  initialized = true;

  const bus = getSharedEventBus();
  bus.subscribe<FosMetrics>("fos:metrics:computed", (event) => {
    lastMetrics = event.payload;
  });
}

export function getFosPortfolioMetrics(): FosMetrics | null {
  initPortfolioFosBridge();
  return lastMetrics;
}
