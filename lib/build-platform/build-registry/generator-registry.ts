/** Build Registry — generator entries (Epic 6.2). */

import { createBuildRegistry, registerMany } from "./registry";
import type { BuildRegistry, GeneratorCategory, RegistryCapability, RegistryEntry } from "./types";

const V = "1.0.0";
const NOW = "2026-07-06T00:00:00.000Z";

function cap(...items: [string, string, string?][]): RegistryCapability[] {
  return items.map(([id, label, description]) => ({ id, label, description }));
}

function generator(
  id: string,
  name: string,
  category: GeneratorCategory,
  status: RegistryEntry["status"],
  description: string,
  capabilities: RegistryCapability[],
  tags: string[] = []
): RegistryEntry {
  return {
    id,
    name,
    type: "generator",
    version: V,
    status,
    description,
    capabilities,
    category,
    tags,
    updatedAt: NOW,
  };
}

export const FRONTEND_GENERATORS: RegistryEntry[] = [
  generator(
    "gen-nextjs-page",
    "Next.js Page Generator",
    "frontend",
    "stable",
    "Generates App Router pages with metadata, layouts, and server/client boundaries.",
    cap(
      ["app-router", "App Router", "Next.js 15 App Router pages"],
      ["metadata", "Metadata", "SEO and OpenGraph metadata blocks"],
      ["fhis-layout", "FHIS Layout", "Wraps pages with FHIS Container and Panel"],
    ),
    ["nextjs", "react", "fhis"]
  ),
  generator(
    "gen-fhis-component",
    "FHIS Component Generator",
    "frontend",
    "stable",
    "Scaffolds FHIS UI components — Card, Badge, Status, Panel, and layout primitives.",
    cap(
      ["fhis-primitives", "FHIS Primitives", "Core design-system components"],
      ["token-aware", "Token Aware", "Uses ForgeOS design tokens"],
      ["lab-ready", "Lab Ready", "Includes lab showcase wiring"],
    ),
    ["fhis", "design-system"]
  ),
  generator(
    "gen-react-client",
    "React Client Component Generator",
    "frontend",
    "beta",
    "Creates client components with hooks, state, and FHIS interaction patterns.",
    cap(
      ["use-client", "use client", "Client boundary directive"],
      ["hooks", "Hooks", "useState and useCallback scaffolding"],
    ),
    ["react", "client"]
  ),
  generator(
    "gen-dashboard-view",
    "Dashboard View Generator",
    "frontend",
    "beta",
    "Produces dashboard shells with KPI blocks, venture pipeline, and activity feeds.",
    cap(
      ["kpi-blocks", "KPI Blocks", "Metric summary cards"],
      ["venture-pipeline", "Venture Pipeline", "Stage visualization"],
    ),
    ["dashboard", "fhis"]
  ),
];

export const BACKEND_GENERATORS: RegistryEntry[] = [
  generator(
    "gen-api-route",
    "API Route Generator",
    "backend",
    "stable",
    "Generates Next.js route handlers with typed request/response contracts.",
    cap(
      ["rest", "REST", "GET/POST/PATCH handlers"],
      ["validation", "Validation", "Input schema checks"],
    ),
    ["nextjs", "api"]
  ),
  generator(
    "gen-trpc-router",
    "tRPC Router Generator",
    "backend",
    "experimental",
    "Scaffolds tRPC routers with procedure stubs and shared context.",
    cap(
      ["procedures", "Procedures", "Query and mutation stubs"],
      ["context", "Context", "Shared request context"],
    ),
    ["trpc", "typescript"]
  ),
  generator(
    "gen-service-layer",
    "Service Layer Generator",
    "backend",
    "beta",
    "Creates domain service modules with repository interfaces.",
    cap(
      ["repository", "Repository", "Data access abstraction"],
      ["domain-logic", "Domain Logic", "Business rule stubs"],
    ),
    ["clean-architecture"]
  ),
];

export const DATABASE_GENERATORS: RegistryEntry[] = [
  generator(
    "gen-prisma-schema",
    "Prisma Schema Generator",
    "database",
    "stable",
    "Generates Prisma models from venture entities and relationships.",
    cap(
      ["models", "Models", "Entity model definitions"],
      ["relations", "Relations", "One-to-many and many-to-many"],
      ["migrations", "Migrations", "Initial migration scaffold"],
    ),
    ["prisma", "postgresql"]
  ),
  generator(
    "gen-supabase-migration",
    "Supabase Migration Generator",
    "database",
    "beta",
    "Creates SQL migrations for Supabase with RLS policy stubs.",
    cap(
      ["sql", "SQL", "Raw SQL migrations"],
      ["rls", "RLS", "Row-level security policies"],
    ),
    ["supabase", "postgresql"]
  ),
  generator(
    "gen-seed-data",
    "Seed Data Generator",
    "database",
    "beta",
    "Produces mock seed scripts aligned with venture personas.",
    cap(
      ["fixtures", "Fixtures", "Deterministic test data"],
      ["personas", "Personas", "Persona-driven records"],
    ),
    ["seeding"]
  ),
];

export const DEPLOYMENT_GENERATORS: RegistryEntry[] = [
  generator(
    "gen-vercel-deploy",
    "Vercel Deploy Generator",
    "deployment",
    "stable",
    "Outputs vercel.json, environment templates, and preview deploy hooks.",
    cap(
      ["vercel-json", "vercel.json", "Platform configuration"],
      ["env-template", "Env Template", ".env.example generation"],
      ["preview", "Preview", "Preview deployment wiring"],
    ),
    ["vercel", "serverless"]
  ),
  generator(
    "gen-docker-compose",
    "Docker Compose Generator",
    "deployment",
    "beta",
    "Scaffolds multi-service Docker Compose for local and staging.",
    cap(
      ["compose", "Compose", "docker-compose.yml"],
      ["healthcheck", "Healthcheck", "Service health probes"],
    ),
    ["docker", "self-hosted"]
  ),
  generator(
    "gen-ci-pipeline",
    "CI Pipeline Generator",
    "deployment",
    "beta",
    "Creates GitHub Actions workflows with build, lint, and deploy stages.",
    cap(
      ["github-actions", "GitHub Actions", "Workflow YAML"],
      ["quality-gates", "Quality Gates", "Lint and build checks"],
    ),
    ["ci", "github"]
  ),
];

export const QA_GENERATORS: RegistryEntry[] = [
  generator(
    "gen-playwright-e2e",
    "Playwright E2E Generator",
    "qa",
    "stable",
    "Generates Playwright specs from user stories and core flows.",
    cap(
      ["e2e", "E2E", "End-to-end browser tests"],
      ["user-stories", "User Stories", "Story-to-spec mapping"],
    ),
    ["playwright", "testing"]
  ),
  generator(
    "gen-a11y-audit",
    "Accessibility Audit Generator",
    "qa",
    "beta",
    "Produces axe-core audit scripts and FHIS accessibility checklists.",
    cap(
      ["axe", "axe-core", "Automated a11y scans"],
      ["fhis-a11y", "FHIS A11y", "Design-system accessibility rules"],
    ),
    ["accessibility", "a11y"]
  ),
  generator(
    "gen-api-contract-test",
    "API Contract Test Generator",
    "qa",
    "beta",
    "Creates contract tests for API routes from OpenAPI-style specs.",
    cap(
      ["contract", "Contract", "Request/response contracts"],
      ["openapi", "OpenAPI", "Spec-driven tests"],
    ),
    ["api", "testing"]
  ),
];

export const ALL_GENERATORS: RegistryEntry[] = [
  ...FRONTEND_GENERATORS,
  ...BACKEND_GENERATORS,
  ...DATABASE_GENERATORS,
  ...DEPLOYMENT_GENERATORS,
  ...QA_GENERATORS,
];

export function createGeneratorRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerMany(registry, ALL_GENERATORS);
  return registry;
}

export function registerGenerators(target: BuildRegistry): RegistryEntry[] {
  return registerMany(target, ALL_GENERATORS);
}
