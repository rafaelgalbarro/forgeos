import type { HeatmapZone } from "./types";
import { readStorage, writeStorage } from "@/lib/design-partners/storage";

const HEATMAP_KEY = "forgeos-cs-heatmap";

interface HeatmapClick {
  page: string;
  zone: string;
  timestamp: string;
}

let memoryClicks: HeatmapClick[] = [];

function read(): HeatmapClick[] {
  if (typeof window === "undefined") return memoryClicks;
  const stored = readStorage<HeatmapClick[]>(HEATMAP_KEY, []);
  memoryClicks = stored;
  return memoryClicks;
}

function write(clicks: HeatmapClick[]): void {
  memoryClicks = clicks;
  writeStorage(HEATMAP_KEY, clicks);
}

/** Stub — registra clics sin SDK externo */
export function recordHeatmapClick(page: string, zone: string): void {
  write([...read(), { page, zone, timestamp: new Date().toISOString() }]);
}

export function getHeatmapZones(page?: string): HeatmapZone[] {
  const clicks = page ? read().filter((c) => c.page === page) : read();
  const maxClicks = Math.max(1, ...clicks.map(() => 1));

  const zoneMap = new Map<string, { page: string; zone: string; clicks: number }>();
  for (const c of clicks) {
    const key = `${c.page}::${c.zone}`;
    const existing = zoneMap.get(key) ?? { page: c.page, zone: c.zone, clicks: 0 };
    existing.clicks += 1;
    zoneMap.set(key, existing);
  }

  return Array.from(zoneMap.values())
    .map((z, i) => ({
      id: `hz-${i}`,
      page: z.page,
      zone: z.zone,
      clicks: z.clicks,
      intensity: Math.round((z.clicks / maxClicks) * 100),
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

export function getDemoHeatmapStructure(): HeatmapZone[] {
  return [
    { id: "demo-nav", page: "/customer-success", zone: "nav", clicks: 12, intensity: 80 },
    { id: "demo-kpi", page: "/customer-success", zone: "kpi-grid", clicks: 28, intensity: 100 },
    { id: "demo-cta", page: "/customer-success", zone: "cta-primary", clicks: 8, intensity: 55 },
    { id: "demo-form", page: "/nps", zone: "survey-form", clicks: 15, intensity: 70 },
  ];
}
