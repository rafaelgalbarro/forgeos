import type { ResearchReport } from "./types/research";

const REQUIRED_STRING_ARRAYS: (keyof ResearchReport)[] = [
  "targetSegments",
  "marketRisks",
  "opportunities",
  "differentiationAngles",
  "validationPlan",
  "recommendedNextQuestions",
];

export function validateResearchReportShape(data: unknown): data is ResearchReport {
  if (!data || typeof data !== "object") return false;
  const report = data as Record<string, unknown>;

  if (typeof report.marketSummary !== "string" || !report.marketSummary.trim()) return false;
  if (!Array.isArray(report.competitors) || report.competitors.length === 0) return false;

  for (const key of REQUIRED_STRING_ARRAYS) {
    if (!Array.isArray(report[key]) || (report[key] as unknown[]).length === 0) return false;
  }

  for (const c of report.competitors) {
    if (!c || typeof c !== "object") return false;
    const comp = c as Record<string, unknown>;
    if (typeof comp.name !== "string" || typeof comp.type !== "string") return false;
    if (!Array.isArray(comp.strengths) || !Array.isArray(comp.weaknesses)) return false;
  }

  return true;
}
