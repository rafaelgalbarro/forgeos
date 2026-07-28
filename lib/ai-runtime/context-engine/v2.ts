/** ForgeOS AI Runtime RC6 — Context Engine v2. */

import { buildAIContext, contextBlocksToPromptSection } from "../context-engine/context-engine";
import type { AIRuntimeContextInput, ContextSource } from "../types";

export type ContextLayer =
  | "executive"
  | "department"
  | "capability"
  | "skill"
  | "execution";

export interface ContextV2Input extends AIRuntimeContextInput {
  department?: string;
  capability?: string;
  skill?: string;
  executionPhase?: string;
  policies?: string[];
  securityConstraints?: string[];
  conversationHistory?: string[];
  architectureSummary?: string;
}

export interface BuiltContextV2 {
  layers: ContextLayer[];
  blocks: { source: ContextSource | ContextLayer; content: string }[];
  promptSection: string;
  metadata: Record<string, unknown>;
}

export function buildContextV2(input?: ContextV2Input): BuiltContextV2 {
  const base = buildAIContext(input);
  const blocks: BuiltContextV2["blocks"] = base.blocks.map((b) => ({
    source: b.source,
    content: b.content,
  }));
  const layers: ContextLayer[] = [];

  if (input?.department) {
    layers.push("department");
    blocks.push({
      source: "department",
      content: `Department: ${input.department}. Act within departmental scope and report to executive mesh.`,
    });
  }

  if (input?.capability) {
    layers.push("capability");
    blocks.push({
      source: "capability",
      content: `Capability: ${input.capability}. Execute via capability layer adapter.`,
    });
  }

  if (input?.skill) {
    layers.push("skill");
    blocks.push({
      source: "skill",
      content: `Skill: ${input.skill}. Follow skill governance policies.`,
    });
  }

  if (input?.executionPhase) {
    layers.push("execution");
    blocks.push({
      source: "execution",
      content: `Execution phase: ${input.executionPhase}.`,
    });
  }

  layers.unshift("executive");
  blocks.unshift({
    source: "executive",
    content: "Executive Context: ForgeOS AI Operating System — respond with executive summaries only.",
  });

  if (input?.architectureSummary) {
    blocks.push({ source: "product", content: `Architecture:\n${input.architectureSummary}` });
  }

  if (input?.conversationHistory?.length) {
    blocks.push({
      source: "memory",
      content: `Conversation:\n${input.conversationHistory.slice(-5).join("\n")}`,
    });
  }

  if (input?.policies?.length) {
    blocks.push({
      source: "founder",
      content: `Policies:\n${input.policies.map((p) => `- ${p}`).join("\n")}`,
    });
  }

  if (input?.securityConstraints?.length) {
    blocks.push({
      source: "founder",
      content: `Security:\n${input.securityConstraints.map((s) => `- ${s}`).join("\n")}`,
    });
  }

  return {
    layers,
    blocks,
    promptSection: contextBlocksToPromptSection(
      blocks.filter((b) => !["executive", "department", "capability", "skill", "execution"].includes(b.source)) as {
        source: ContextSource;
        content: string;
      }[]
    ) + blocks
      .filter((b) => ["executive", "department", "capability", "skill", "execution"].includes(b.source))
      .map((b) => `## ${b.source}\n${b.content}`)
      .join("\n\n"),
    metadata: { ...base.metadata, layers, department: input?.department },
  };
}

export function buildExecutiveContext(input?: ContextV2Input): string {
  return buildContextV2({ ...input, department: undefined }).promptSection;
}

export function buildDepartmentContext(department: string, input?: ContextV2Input): string {
  return buildContextV2({ ...input, department }).promptSection;
}

export function buildCapabilityContext(capability: string, input?: ContextV2Input): string {
  return buildContextV2({ ...input, capability }).promptSection;
}

export function buildSkillContext(skill: string, input?: ContextV2Input): string {
  return buildContextV2({ ...input, skill }).promptSection;
}

export function buildExecutionContext(phase: string, input?: ContextV2Input): string {
  return buildContextV2({ ...input, executionPhase: phase }).promptSection;
}
