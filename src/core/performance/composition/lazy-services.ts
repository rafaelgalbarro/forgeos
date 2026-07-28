/**
 * PROGRAM 6100 — Lazy service registry for composition root.
 * Core services eager; heavy services lazy-loaded server-side on demand.
 */

export type ServiceTier = "core" | "lazy";

export interface ServiceDescriptor {
  name: string;
  tier: ServiceTier;
  module: string;
  loaded: boolean;
  loadTimeMs?: number;
}

const CORE_SERVICES = [
  "commandBus",
  "queryBus",
  "eventBus",
  "missionRepository",
  "ventureRepository",
  "featureFlags",
  "clock",
] as const;

const LAZY_SERVICES = [
  "factories",
  "aiRuntime",
  "previewRuntime",
  "deploymentAdapters",
  "provenanceGraph",
  "exportEngine",
  "codeGen",
  "heavyGraph",
] as const;

const lazyInstances = new Map<string, unknown>();
const loadMetrics = new Map<string, number>();

export function getServiceRegistry(): ServiceDescriptor[] {
  const core: ServiceDescriptor[] = CORE_SERVICES.map((name) => ({
    name,
    tier: "core",
    module: `src/core/composition/root.ts`,
    loaded: true,
  }));
  const lazy: ServiceDescriptor[] = LAZY_SERVICES.map((name) => ({
    name,
    tier: "lazy",
    module: `lazy:${name}`,
    loaded: lazyInstances.has(name),
    loadTimeMs: loadMetrics.get(name),
  }));
  return [...core, ...lazy];
}

export async function loadLazyService<T>(name: string, loader: () => Promise<T> | T): Promise<T> {
  if (lazyInstances.has(name)) return lazyInstances.get(name) as T;
  const start = performance.now();
  const instance = await loader();
  const elapsed = performance.now() - start;
  lazyInstances.set(name, instance);
  loadMetrics.set(name, elapsed);
  return instance;
}

export function isLazyServiceLoaded(name: string): boolean {
  return lazyInstances.has(name);
}

export function getLazyServiceLoadTime(name: string): number | undefined {
  return loadMetrics.get(name);
}

export function resetLazyServices(): void {
  lazyInstances.clear();
  loadMetrics.clear();
}
