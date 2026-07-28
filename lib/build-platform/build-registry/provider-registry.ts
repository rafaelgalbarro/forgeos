/** Build Registry — AI and deployment providers (Epic 6.2). */

import { createBuildRegistry, registerMany } from "./registry";
import type { BuildRegistry, RegistryCapability, RegistryEntry } from "./types";

const V = "1.0.0";
const NOW = "2026-07-06T00:00:00.000Z";

function cap(...items: [string, string, string?][]): RegistryCapability[] {
  return items.map(([id, label, description]) => ({ id, label, description }));
}

function provider(
  id: string,
  name: string,
  status: RegistryEntry["status"],
  description: string,
  capabilities: RegistryCapability[],
  category: string,
  tags: string[] = []
): RegistryEntry {
  return {
    id,
    name,
    type: "provider",
    version: V,
    status,
    description,
    capabilities,
    category,
    tags,
    updatedAt: NOW,
  };
}

export const OFFICIAL_PROVIDERS: RegistryEntry[] = [
  provider(
    "prov-openai",
    "OpenAI",
    "stable",
    "GPT models for code generation, research, and product authoring.",
    cap(
      ["chat", "Chat Completions", "Multi-turn generation"],
      ["code", "Code Generation", "Structured code output"],
    ),
    "ai",
    ["llm", "openai"]
  ),
  provider(
    "prov-anthropic",
    "Anthropic",
    "stable",
    "Claude models for long-context reasoning and architecture reviews.",
    cap(
      ["chat", "Chat Completions", "Multi-turn generation"],
      ["long-context", "Long Context", "Large document analysis"],
    ),
    "ai",
    ["llm", "anthropic"]
  ),
  provider(
    "prov-cursor",
    "Cursor Agent",
    "beta",
    "Cursor SDK agents for autonomous build tasks and code review.",
    cap(
      ["agent", "Agent Runtime", "Autonomous task execution"],
      ["mcp", "MCP", "Model Context Protocol tools"],
    ),
    "ai",
    ["cursor", "agent"]
  ),
  provider(
    "prov-vercel",
    "Vercel",
    "stable",
    "Serverless deployment for Next.js ventures with preview URLs.",
    cap(
      ["deploy", "Deploy", "Production and preview deploys"],
      ["edge", "Edge", "Edge runtime support"],
    ),
    "deployment",
    ["vercel", "serverless"]
  ),
  provider(
    "prov-supabase",
    "Supabase",
    "stable",
    "Managed PostgreSQL, auth, and storage for venture backends.",
    cap(
      ["database", "Database", "PostgreSQL hosting"],
      ["auth", "Auth", "User authentication"],
      ["storage", "Storage", "File storage buckets"],
    ),
    "deployment",
    ["supabase", "postgresql"]
  ),
  provider(
    "prov-railway",
    "Railway",
    "beta",
    "Container and database hosting for full-stack ventures.",
    cap(
      ["deploy", "Deploy", "Container deploys"],
      ["database", "Database", "Managed Postgres"],
    ),
    "deployment",
    ["railway", "docker"]
  ),
  provider(
    "prov-github",
    "GitHub",
    "stable",
    "Repository hosting, Actions CI, and pull request workflows.",
    cap(
      ["repo", "Repository", "Git hosting"],
      ["actions", "Actions", "CI/CD pipelines"],
      ["pr", "Pull Requests", "Code review workflow"],
    ),
    "platform",
    ["github", "git"]
  ),
];

export function createProviderRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerMany(registry, OFFICIAL_PROVIDERS);
  return registry;
}

export function registerProviders(target: BuildRegistry): RegistryEntry[] {
  return registerMany(target, OFFICIAL_PROVIDERS);
}
