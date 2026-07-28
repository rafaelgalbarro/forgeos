/** Strategy pillar adapter → @/lib/ai (types only). */

import type { ResearchReport, ResearchReportResponse } from "@/lib/ai/types/research";

export type { ResearchReport, ResearchReportResponse };

export const researchAdapter = {
  readonly: true,
  module: "research",
  pillarId: "strategy" as const,

  isAvailable(): boolean {
    return true;
  },

  async listReportSections(): Promise<string[]> {
    return ["market", "competitors", "trends", "risks"];
  },
} as const;
