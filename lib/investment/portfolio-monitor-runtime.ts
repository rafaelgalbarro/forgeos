import {
  ContinuousPortfolioMonitor,
  InMemoryPortfolioMonitorStore,
} from "@/src/core/investment/portfolio-monitor";
import {
  resolvePortfolioMonitorProvider,
  type PortfolioMonitorDataLabel,
  type ResolvedPortfolioMonitorProvider,
} from "@/lib/investment/portfolio-monitor-provider-factory";

type RuntimeState = {
  monitor: ContinuousPortfolioMonitor;
  resolved: ResolvedPortfolioMonitorProvider;
};

declare global {
  var __forgeosPortfolioMonitorRuntime: RuntimeState | undefined;
}

function createMonitor(): RuntimeState {
  const resolved = resolvePortfolioMonitorProvider();
  return {
    monitor: new ContinuousPortfolioMonitor({
      snapshotProvider: resolved.provider,
      store: new InMemoryPortfolioMonitorStore(),
      pollIntervalMs: 10_000,
    }),
    resolved,
  };
}

export function getPortfolioMonitorRuntime(): {
  monitor: ContinuousPortfolioMonitor;
  label: PortfolioMonitorDataLabel;
  note: string;
} {
  if (!globalThis.__forgeosPortfolioMonitorRuntime) {
    globalThis.__forgeosPortfolioMonitorRuntime = createMonitor();
  }
  const runtime = globalThis.__forgeosPortfolioMonitorRuntime;
  return {
    monitor: runtime.monitor,
    get label() {
      return runtime.resolved.label;
    },
    get note() {
      return runtime.resolved.note;
    },
  };
}

/** Test helper — reset singleton between cases. */
export function resetPortfolioMonitorRuntimeForTests(): void {
  const current = globalThis.__forgeosPortfolioMonitorRuntime;
  if (current?.monitor.isRunning()) {
    current.monitor.stop();
  }
  globalThis.__forgeosPortfolioMonitorRuntime = undefined;
}
