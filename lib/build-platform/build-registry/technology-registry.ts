/** Build Registry — technology stacks (Epic 6.2). */

import { createBuildRegistry, registerMany } from "./registry";
import type { BuildRegistry, RegistryCapability, RegistryEntry } from "./types";

const NOW = "2026-07-06T00:00:00.000Z";

function cap(...items: [string, string, string?][]): RegistryCapability[] {
  return items.map(([id, label, description]) => ({ id, label, description }));
}

function technology(
  id: string,
  name: string,
  version: string,
  status: RegistryEntry["status"],
  description: string,
  capabilities: RegistryCapability[],
  category: string,
  tags: string[] = []
): RegistryEntry {
  return {
    id,
    name,
    type: "technology",
    version,
    status,
    description,
    capabilities,
    category,
    tags,
    updatedAt: NOW,
  };
}

export const OFFICIAL_TECHNOLOGIES: RegistryEntry[] = [
  technology(
    "tech-nextjs",
    "Next.js",
    "15.5.19",
    "stable",
    "React framework with App Router, server components, and API routes.",
    cap(
      ["app-router", "App Router", "File-based routing"],
      ["rsc", "RSC", "React Server Components"],
      ["api-routes", "API Routes", "Route handlers"],
    ),
    "framework",
    ["nextjs", "react"]
  ),
  technology(
    "tech-react",
    "React",
    "19.0.0",
    "stable",
    "UI library for components, hooks, and client/server boundaries.",
    cap(
      ["hooks", "Hooks", "State and effects"],
      ["server-components", "Server Components", "RSC support"],
    ),
    "framework",
    ["react"]
  ),
  technology(
    "tech-fhis",
    "FHIS Design System",
    "1.0.0",
    "stable",
    "ForgeOS Human Interface System — tokens, components, and lab patterns.",
    cap(
      ["tokens", "Tokens", "Color, spacing, motion tokens"],
      ["components", "Components", "Card, Badge, Status, Panel"],
      ["lab-only", "Lab Only", "FHIS restricted to lab UI"],
    ),
    "design-system",
    ["fhis", "design-system", "forgeos"]
  ),
  technology(
    "tech-typescript",
    "TypeScript",
    "5.7.2",
    "stable",
    "Typed superset of JavaScript for ForgeOS modules and generators.",
    cap(
      ["strict", "Strict Mode", "Strict type checking"],
      ["interfaces", "Interfaces", "Contract definitions"],
    ),
    "language",
    ["typescript"]
  ),
  technology(
    "tech-postgresql",
    "PostgreSQL",
    "16",
    "stable",
    "Primary relational database for venture data and Prisma/Supabase.",
    cap(
      ["relational", "Relational", "ACID transactions"],
      ["jsonb", "JSONB", "Semi-structured data"],
    ),
    "database",
    ["postgresql", "sql"]
  ),
  technology(
    "tech-prisma",
    "Prisma",
    "6.0.0",
    "stable",
    "ORM with schema-first migrations and type-safe client.",
    cap(
      ["schema", "Schema", "Declarative models"],
      ["migrate", "Migrate", "Migration tooling"],
    ),
    "database",
    ["prisma", "orm"]
  ),
  technology(
    "tech-supabase",
    "Supabase",
    "2.0.0",
    "beta",
    "Backend-as-a-service with Postgres, auth, and realtime.",
    cap(
      ["auth", "Auth", "User management"],
      ["realtime", "Realtime", "Live subscriptions"],
      ["storage", "Storage", "File buckets"],
    ),
    "platform",
    ["supabase", "baas"]
  ),
  technology(
    "tech-vercel",
    "Vercel",
    "1.0.0",
    "stable",
    "Deployment platform optimized for Next.js ventures.",
    cap(
      ["serverless", "Serverless", "Function deploys"],
      ["preview", "Preview", "Branch previews"],
      ["edge", "Edge", "Edge network"],
    ),
    "deployment",
    ["vercel", "serverless"]
  ),
  technology(
    "tech-playwright",
    "Playwright",
    "1.49.0",
    "beta",
    "Browser automation for E2E testing generated ventures.",
    cap(
      ["chromium", "Chromium", "Headless browser"],
      ["e2e", "E2E", "End-to-end tests"],
    ),
    "testing",
    ["playwright", "testing"]
  ),
  technology(
    "tech-docker",
    "Docker",
    "27.0.0",
    "beta",
    "Container runtime for self-hosted and staging environments.",
    cap(
      ["compose", "Compose", "Multi-service orchestration"],
      ["multi-stage", "Multi-stage", "Optimized builds"],
    ),
    "deployment",
    ["docker", "containers"]
  ),
];

export function createTechnologyRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerMany(registry, OFFICIAL_TECHNOLOGIES);
  return registry;
}

export function registerTechnologies(target: BuildRegistry): RegistryEntry[] {
  return registerMany(target, OFFICIAL_TECHNOLOGIES);
}
