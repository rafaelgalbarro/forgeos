/** Product pillar adapter → @/lib/domain (venture sections / UX stubs). */

import type { VentureSection, VentureSectionId } from "@/lib/domain/venture";

export type { VentureSection, VentureSectionId };

export const uxAdapter = {
  readonly: true,
  module: "ux",
  pillarId: "product" as const,

  isAvailable(): boolean {
    return true;
  },

  async listUxSections(): Promise<VentureSectionId[]> {
    return ["wireframes", "ux", "landing"];
  },
} as const;
