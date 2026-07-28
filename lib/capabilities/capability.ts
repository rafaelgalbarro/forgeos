/** ForgeOS Capability Layer — base definitions & helpers (RC4.9). */

import type {
  CapabilityDefinition,
  CapabilityCategory,
  CapabilityHealth,
  CapabilityPriority,
  CapabilityRisk,
  CapabilityStatus,
} from "./types";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";

export function defineCapability(
  params: Omit<CapabilityDefinition, "health" | "status" | "version"> & {
    health?: CapabilityHealth;
    status?: CapabilityStatus;
    version?: string;
  }
): CapabilityDefinition {
  return {
    version: "1.0.0",
    health: "healthy",
    status: "sandbox",
    ...params,
  };
}

export function capabilityLabel(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const DEFAULT_DEPARTMENTS: MeshDepartmentId[] = [
  "ceo",
  "cto",
  "cpo",
  "coo",
  "deployment",
];

export const CATEGORY_DEFAULTS: Record<
  CapabilityCategory,
  { risk: CapabilityRisk; estimatedCost: number; estimatedLatency: number; priority: CapabilityPriority }
> = {
  development: { risk: "medium", estimatedCost: 0.15, estimatedLatency: 5000, priority: "high" },
  productivity: { risk: "low", estimatedCost: 0.02, estimatedLatency: 2000, priority: "normal" },
  marketing: { risk: "medium", estimatedCost: 0.1, estimatedLatency: 4000, priority: "normal" },
  research: { risk: "low", estimatedCost: 0.05, estimatedLatency: 8000, priority: "normal" },
  business: { risk: "high", estimatedCost: 0.08, estimatedLatency: 3000, priority: "high" },
  analytics: { risk: "low", estimatedCost: 0.04, estimatedLatency: 6000, priority: "normal" },
  project: { risk: "low", estimatedCost: 0.03, estimatedLatency: 2500, priority: "normal" },
  venture: { risk: "medium", estimatedCost: 0.2, estimatedLatency: 10000, priority: "critical" },
};

export function isCapabilityActive(def: CapabilityDefinition): boolean {
  return def.status === "active" || def.status === "sandbox";
}

export function isCapabilityHealthy(def: CapabilityDefinition): boolean {
  return def.health === "healthy" || def.health === "degraded";
}
