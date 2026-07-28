import type { VentureProject } from "@/lib/domain/venture";
import { generateBuildPlan } from "@/lib/build-plan/build-plan-generator";
import type { BuildPrompt, ConnectorStub } from "../types";

export function generateCodexPrompt(venture: VentureProject): string {
  const plan = generateBuildPlan(venture);
  return `Build "${venture.name}" MVP using OpenAI Codex patterns.\n\n${venture.ideaText}\n\nStack:\n${plan.recommendedStack.map((s) => `- ${s.layer}: ${s.technology}`).join("\n")}\n\nOrder:\n${plan.implementationOrder.map((s) => `- ${s}`).join("\n")}`;
}

export function generateCopilotPrompt(venture: VentureProject): string {
  const plan = generateBuildPlan(venture);
  return `GitHub Copilot task: Implement "${venture.name}" following ForgeOS Build Plan.\n\nScreens: ${plan.screens.join(", ")}\n\nModules: ${plan.technicalModules.join(", ")}`;
}

export function generateReplitPrompt(venture: VentureProject): string {
  const plan = generateBuildPlan(venture);
  return `Replit Agent: Scaffold and deploy "${venture.name}" MVP.\n\n${plan.technicalSummary}\n\nOrder:\n${plan.implementationOrder.join("\n")}`;
}

export function generateAllPrompts(venture: VentureProject): BuildPrompt[] {
  if (!venture.productPRD) return [];

  const plan = generateBuildPlan(venture);
  return [
    { target: "Cursor", title: "Cursor Agent Prompt", content: plan.cursorPrompt },
    { target: "Claude", title: "Claude Code Prompt", content: plan.claudePrompt },
    { target: "Codex", title: "Codex Prompt", content: generateCodexPrompt(venture) },
    { target: "GitHub Copilot", title: "Copilot Instructions", content: generateCopilotPrompt(venture) },
    { target: "Replit", title: "Replit Agent Prompt", content: generateReplitPrompt(venture) },
  ];
}

export const CONNECTOR_STUBS: ConnectorStub[] = [
  { id: "github", name: "GitHub", status: "stub", description: "Push repo, PRs, Actions (interface only)" },
  { id: "vercel", name: "Vercel", status: "stub", description: "Deploy frontend, preview URLs (interface only)" },
  { id: "supabase", name: "Supabase", status: "stub", description: "Database, auth, storage (interface only)" },
  { id: "docker", name: "Docker", status: "stub", description: "Container builds (interface only)" },
  { id: "cloudflare", name: "Cloudflare", status: "stub", description: "CDN, Workers, DNS (interface only)" },
];
