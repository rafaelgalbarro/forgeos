/** ForgeOS AI Capability Skills — aggregated registry (RC4.7). */

import type { SkillDefinition } from "@/lib/skills/types";
import type { AICapabilityDomain, AICapabilityModule } from "./types";

let cachedModules: AICapabilityModule[] | null = null;

function loadAICapabilityModules(): AICapabilityModule[] {
  if (cachedModules) return cachedModules;

  /* Lazy load — avoids pulling AI Runtime + reasoning chain on UI import. */
  const { module: reasoningModule } = require("./reasoning") as typeof import("./reasoning");
  const { module: codingModule } = require("./coding") as typeof import("./coding");
  const { module: visionModule } = require("./vision") as typeof import("./vision");
  const { module: voiceModule } = require("./voice") as typeof import("./voice");
  const { module: translationModule } = require("./translation") as typeof import("./translation");
  const { module: searchModule } = require("./search") as typeof import("./search");
  const { module: memoryModule } = require("./memory") as typeof import("./memory");
  const { module: ocrModule } = require("./ocr") as typeof import("./ocr");
  const { module: embeddingsModule } = require("./embeddings") as typeof import("./embeddings");
  const { module: ragModule } = require("./rag") as typeof import("./rag");
  const { module: imagesModule } = require("./images") as typeof import("./images");
  const { module: videoModule } = require("./video") as typeof import("./video");
  const { module: audioModule } = require("./audio") as typeof import("./audio");

  cachedModules = [
    reasoningModule,
    codingModule,
    visionModule,
    voiceModule,
    translationModule,
    searchModule,
    memoryModule,
    ocrModule,
    embeddingsModule,
    ragModule,
    imagesModule,
    videoModule,
    audioModule,
  ];
  return cachedModules;
}

export function getAICapabilityModules(): AICapabilityModule[] {
  return loadAICapabilityModules();
}

export function getAISkillRegistry(): SkillDefinition[] {
  return loadAICapabilityModules().map((m) => m.registry);
}

export const AI_CAPABILITY_MODULES: AICapabilityModule[] = [];

export const AI_SKILL_REGISTRY: SkillDefinition[] = [];

export function ensureAISkillRegistry(): SkillDefinition[] {
  const registry = getAISkillRegistry();
  if (AI_SKILL_REGISTRY.length === 0) {
    AI_SKILL_REGISTRY.push(...registry);
  }
  return AI_SKILL_REGISTRY;
}

let cachedSkillIds: Set<string> | null = null;

export function getAISkillIds(): Set<string> {
  if (!cachedSkillIds) {
    cachedSkillIds = new Set(getAISkillRegistry().map((s) => s.id));
  }
  return cachedSkillIds;
}

export const AI_SKILL_IDS = new Set<string>();

export function getAICapabilityModule(domain: AICapabilityDomain): AICapabilityModule | undefined {
  return loadAICapabilityModules().find((m) => m.config.domain === domain);
}

export function getAICapabilityModuleById(skillId: string): AICapabilityModule | undefined {
  return loadAICapabilityModules().find((m) => m.config.id === skillId);
}

export function listAICapabilityDomains(): AICapabilityDomain[] {
  return loadAICapabilityModules().map((m) => m.config.domain);
}

export function isAICapabilitySkill(skillId: string): boolean {
  return getAISkillIds().has(skillId);
}
