/** Build Registry — generated artifact types (Epic 6.2). */

import { createBuildRegistry, registerMany } from "./registry";
import type { BuildRegistry, RegistryCapability, RegistryEntry } from "./types";

const V = "1.0.0";
const NOW = "2026-07-06T00:00:00.000Z";

function cap(...items: [string, string, string?][]): RegistryCapability[] {
  return items.map(([id, label, description]) => ({ id, label, description }));
}

function artifact(
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
    type: "artifact",
    version: V,
    status,
    description,
    capabilities,
    category,
    tags,
    updatedAt: NOW,
  };
}

export const OFFICIAL_ARTIFACTS: RegistryEntry[] = [
  artifact(
    "art-page-tsx",
    "Page Component",
    "stable",
    "Next.js page.tsx with metadata, layout integration, and FHIS shell.",
    cap(
      ["tsx", "TSX", "TypeScript React component"],
      ["metadata-export", "Metadata", "Next.js metadata export"],
    ),
    "frontend",
    ["nextjs", "page"]
  ),
  artifact(
    "art-api-route",
    "API Route Handler",
    "stable",
    "route.ts handler with typed request/response and error mapping.",
    cap(
      ["handler", "Handler", "HTTP method handlers"],
      ["typed-response", "Typed Response", "JSON response contracts"],
    ),
    "backend",
    ["nextjs", "api"]
  ),
  artifact(
    "art-prisma-schema",
    "Prisma Schema",
    "stable",
    "schema.prisma with models, enums, and datasource configuration.",
    cap(
      ["models", "Models", "Entity definitions"],
      ["datasource", "Datasource", "DB connection config"],
    ),
    "database",
    ["prisma"]
  ),
  artifact(
    "art-dockerfile",
    "Dockerfile",
    "beta",
    "Multi-stage Dockerfile for Next.js production builds.",
    cap(
      ["multi-stage", "Multi-stage", "Optimized image layers"],
      ["node-alpine", "Node Alpine", "Lightweight base image"],
    ),
    "deployment",
    ["docker"]
  ),
  artifact(
    "art-env-example",
    "Environment Template",
    "stable",
    ".env.example with documented ForgeOS environment variables.",
    cap(
      ["env-vars", "Env Vars", "Documented variables"],
      ["secrets-placeholder", "Secrets", "Placeholder secret keys"],
    ),
    "config",
    ["env"]
  ),
  artifact(
    "art-playwright-spec",
    "Playwright Spec",
    "beta",
    "E2E test spec generated from venture user stories.",
    cap(
      ["browser-test", "Browser Test", "Chromium-based E2E"],
      ["story-mapping", "Story Mapping", "User story coverage"],
    ),
    "qa",
    ["playwright", "testing"]
  ),
  artifact(
    "art-readme",
    "Project README",
    "stable",
    "README.md with setup, scripts, and architecture overview.",
    cap(
      ["setup", "Setup", "Install and run instructions"],
      ["architecture", "Architecture", "Module overview"],
    ),
    "docs",
    ["markdown"]
  ),
  artifact(
    "art-fhis-component",
    "FHIS Component",
    "stable",
    "Design-system component with token-aware styling and variants.",
    cap(
      ["variants", "Variants", "Size and style variants"],
      ["tokens", "Tokens", "FHIS design tokens"],
    ),
    "frontend",
    ["fhis", "design-system"]
  ),
];

export function createArtifactRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerMany(registry, OFFICIAL_ARTIFACTS);
  return registry;
}

export function registerArtifacts(target: BuildRegistry): RegistryEntry[] {
  return registerMany(target, OFFICIAL_ARTIFACTS);
}
