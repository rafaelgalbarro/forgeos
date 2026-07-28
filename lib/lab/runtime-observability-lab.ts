/** Lab harness for Runtime Observability (Epic 4.6). */

import { createRuntimeMonitor, type RuntimeMonitor } from "@/lib/runtime/observability/runtime-monitor";
import type { RuntimeDashboardSnapshot } from "@/lib/runtime/observability/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

export interface RuntimeObservabilityLabSession {
  ventureId: string;
  monitor: RuntimeMonitor;
  refresh(): RuntimeDashboardSnapshot;
  seedDemo(): RuntimeDashboardSnapshot;
  reset(): void;
}

export function createRuntimeObservabilityLab(
  ventureId = LAB_MOCK_VENTURE_ID,
): RuntimeObservabilityLabSession {
  const monitor = createRuntimeMonitor(ventureId);

  return {
    ventureId,
    monitor,

    refresh(): RuntimeDashboardSnapshot {
      return monitor.refresh();
    },

    seedDemo(): RuntimeDashboardSnapshot {
      return monitor.seedDemoPipeline();
    },

    reset(): void {
      monitor.clear();
    },
  };
}

export function runObservabilityDemo(
  session: RuntimeObservabilityLabSession,
): RuntimeDashboardSnapshot {
  return session.seedDemo();
}
