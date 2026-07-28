import type { ProductPRD } from "./types/product";

const STRING_ARRAY_FIELDS: (keyof ProductPRD)[] = [
  "mvpScope",
  "v2Features",
  "userStories",
  "mainScreens",
  "coreFlows",
  "assumptions",
  "risks",
  "successMetrics",
];

export function validateProductPRDShape(data: unknown): data is ProductPRD {
  if (!data || typeof data !== "object") return false;
  const prd = data as Record<string, unknown>;
  const roadmap = prd.roadmap30_60_90 as Record<string, unknown> | undefined;

  if (typeof prd.executiveSummary !== "string" || !prd.executiveSummary.trim()) return false;
  if (typeof prd.problemStatement !== "string") return false;
  if (typeof prd.targetCustomer !== "string") return false;
  if (typeof prd.valueProposition !== "string") return false;

  for (const key of STRING_ARRAY_FIELDS) {
    if (!Array.isArray(prd[key]) || (prd[key] as unknown[]).length === 0) return false;
  }

  if (
    !roadmap ||
    !Array.isArray(roadmap.day30) ||
    !Array.isArray(roadmap.day60) ||
    !Array.isArray(roadmap.day90)
  ) {
    return false;
  }

  return true;
}
