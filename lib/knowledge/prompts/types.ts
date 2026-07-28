import type { KnowledgeEntryBase } from "../types";

export type PromptRole = "system" | "user" | "assistant";

export interface PromptEntry extends KnowledgeEntryBase {
  domain: "prompts";
  role: PromptRole;
  template: string;
  variables: string[];
  outputSchema?: string;
}
