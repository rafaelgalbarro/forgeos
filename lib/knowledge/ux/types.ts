import type { KnowledgeEntryBase } from "../types";

export type UxPatternType = "layout" | "flow" | "component" | "onboarding";

export interface UxEntry extends KnowledgeEntryBase {
  domain: "ux";
  patternType: UxPatternType;
  screens: string[];
  principles: string[];
}
