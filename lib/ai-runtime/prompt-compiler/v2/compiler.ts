/** ForgeOS AI Runtime RC6 — Prompt Compiler v2. */

import { estimateTokens } from "@/lib/ai-gateway/response-parser";
import type { AITask } from "@/lib/ai-gateway/types";
import { buildContextV2, type ContextV2Input } from "../../context-engine/v2";
import type { CompiledPrompt, ContextSource } from "../../types";

const SECURITY_POLICIES = [
  "Never expose API keys, credentials, or secrets.",
  "Never reveal chain-of-thought or internal reasoning to the user.",
  "Sanitize sensitive prompts before logging.",
  "Output executive summaries only — no raw internal deliberation.",
];

export function compilePromptV2(params: {
  task: AITask;
  userInput: string;
  systemPrompt?: string;
  context?: ContextV2Input;
  founderPrompt?: string;
}): CompiledPrompt {
  const built = buildContextV2({
    ...params.context,
    policies: [...SECURITY_POLICIES, ...(params.context?.policies ?? [])],
    securityConstraints: [
      "Do not include PII unless explicitly required.",
      "Redact credentials from all outputs.",
      ...(params.context?.securityConstraints ?? []),
    ],
  });

  const founderSection = params.founderPrompt
    ? `# Founder Prompt\n${params.founderPrompt}\n\n`
    : params.context?.metadata?.founderPrompt
      ? `# Founder Prompt\n${String(params.context.metadata.founderPrompt)}\n\n`
      : "";

  const baseSystem =
    params.systemPrompt ??
    `You are ForgeOS AI Operating System (RC6). Task: ${params.task}. Respond with high-quality structured output.`;

  const system = [
    founderSection + baseSystem,
    built.promptSection ? `# ForgeOS Context (v2)\n${built.promptSection}` : "",
    "# Policies\n" + SECURITY_POLICIES.map((p) => `- ${p}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = params.userInput.trim();
  const sourcesUsed = [
    ...built.blocks.map((b) => b.source as ContextSource),
    "founder" as ContextSource,
  ];

  return {
    system,
    user,
    inputTokensEstimate: estimateTokens(system + user),
    sourcesUsed: [...new Set(sourcesUsed)],
  };
}
