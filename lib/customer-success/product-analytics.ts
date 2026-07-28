import {
  listDesignPartnerEvents,
  getDesignPartnerEventCount,
  trackDesignPartnerEvent,
  trackDesignPartnerPageView,
} from "@/lib/design-partners/analytics";
import { listAnalyticsEvents, getAnalyticsEventCount } from "@/lib/beta-platform/analytics";

export function getProductMetrics(): {
  dpEventCount: number;
  betaEventCount: number;
  totalEvents: number;
  topPaths: Array<{ path: string; count: number }>;
  topEvents: Array<{ event: string; count: number }>;
} {
  const dpEvents = listDesignPartnerEvents();
  const betaEvents = listAnalyticsEvents();

  const pathMap = new Map<string, number>();
  for (const e of [...dpEvents, ...betaEvents]) {
    const path = "path" in e ? e.path : undefined;
    if (path) pathMap.set(path, (pathMap.get(path) ?? 0) + 1);
  }

  const eventMap = new Map<string, number>();
  for (const e of dpEvents) {
    eventMap.set(e.event, (eventMap.get(e.event) ?? 0) + 1);
  }
  for (const e of betaEvents) {
    eventMap.set(e.event, (eventMap.get(e.event) ?? 0) + 1);
  }

  const topPaths = Array.from(pathMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topEvents = Array.from(eventMap.entries())
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    dpEventCount: getDesignPartnerEventCount(),
    betaEventCount: getAnalyticsEventCount(),
    totalEvents: dpEvents.length + betaEvents.length,
    topPaths,
    topEvents,
  };
}

export { trackDesignPartnerEvent, trackDesignPartnerPageView };
