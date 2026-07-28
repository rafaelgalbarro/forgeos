/** Studio pillar adapter → @/lib/knowledge (read types). */

import type { KnowledgeDomain, KnowledgeEntryBase } from "@/lib/knowledge";

export type { KnowledgeDomain, KnowledgeEntryBase };

export const knowledgeAdapter = {
  readonly: true,
  module: "knowledge",
  pillarId: "studio" as const,

  isAvailable(): boolean {
    return true;
  },

  async listDomains(): Promise<KnowledgeDomain[]> {
    return [
      "architecture",
      "business-models",
      "competitors",
      "features",
      "patterns",
      "pricing",
      "prompts",
      "ux",
    ];
  },
} as const;
