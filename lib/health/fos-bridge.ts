import { getSharedEventBus } from "@/lib/fos";

interface HealthAssessment {
  health: number;
  risk: number;
}

let lastAssessment: HealthAssessment | null = null;
let initialized = false;

export function initHealthFosBridge(): void {
  if (initialized) return;
  initialized = true;

  const bus = getSharedEventBus();
  bus.subscribe<HealthAssessment>("fos:health:assessed", (event) => {
    lastAssessment = event.payload;
  });
}

export function getFosHealthAssessment(): HealthAssessment | null {
  initHealthFosBridge();
  return lastAssessment;
}
