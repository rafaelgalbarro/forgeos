/** ForgeOS Productivity Skills — aggregate registry (RC4.3). */

import type { SkillDefinition } from "@/lib/skills/types";
import type { ProductivityProviderModule, ProductivitySkillMetadata } from "./types";
import { emailModule } from "./email";
import { calendarModule } from "./calendar";
import { filesModule } from "./files";
import { documentsModule } from "./documents";
import { messagingModule } from "./messaging";
import { meetingsModule } from "./meetings";
import { knowledgeModule } from "./knowledge";

export const PRODUCTIVITY_MODULES: ProductivityProviderModule[] = [
  emailModule,
  calendarModule,
  filesModule,
  documentsModule,
  messagingModule,
  meetingsModule,
  knowledgeModule,
];

export const PRODUCTIVITY_SKILL_DEFINITIONS: SkillDefinition[] = PRODUCTIVITY_MODULES.map(
  (m) => m.definition
);

export const PRODUCTIVITY_SKILL_METADATA: ProductivitySkillMetadata[] = PRODUCTIVITY_MODULES.map(
  (m) => m.metadata
);

export const PRODUCTIVITY_SKILL_IDS = new Set(PRODUCTIVITY_MODULES.map((m) => m.metadata.id));

const MODULE_BY_ID = new Map(PRODUCTIVITY_MODULES.map((m) => [m.metadata.id, m]));

export function isProductivitySkill(skillId: string): boolean {
  return PRODUCTIVITY_SKILL_IDS.has(skillId);
}

export function getProductivityModule(skillId: string): ProductivityProviderModule | undefined {
  return MODULE_BY_ID.get(skillId);
}

export function listProductivitySkills(): ProductivitySkillMetadata[] {
  return [...PRODUCTIVITY_SKILL_METADATA];
}
