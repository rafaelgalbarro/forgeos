/** Build Registry — build workers (Epic 6.2).
 * Conceptually aligned with runtime workers (lib/runtime/workers) — not a runtime import.
 */

import { createBuildRegistry, registerMany } from "./registry";
import type { BuildRegistry, RegistryCapability, RegistryEntry } from "./types";

const V = "1.0.0";
const NOW = "2026-07-06T00:00:00.000Z";

function cap(...items: [string, string, string?][]): RegistryCapability[] {
  return items.map(([id, label, description]) => ({ id, label, description }));
}

function buildWorker(
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
    type: "worker",
    version: V,
    status,
    description,
    capabilities,
    category,
    tags,
    updatedAt: NOW,
  };
}

/** Build-platform workers — map to runtime departments without importing runtime. */
export const OFFICIAL_BUILD_WORKERS: RegistryEntry[] = [
  buildWorker(
    "bw-frontend",
    "Frontend Build Worker",
    "stable",
    "Orchestrates page, component, and FHIS generation from build context.",
    cap(
      ["page-gen", "Page Generation", "App Router pages"],
      ["fhis-gen", "FHIS Generation", "Design-system components"],
      ["runtime-ref", "Runtime Ref", "Mirrors runtime frontend worker"],
    ),
    "frontend",
    ["build", "frontend"]
  ),
  buildWorker(
    "bw-backend",
    "Backend Build Worker",
    "stable",
    "Generates API routes, services, and data access layers.",
    cap(
      ["api-gen", "API Generation", "Route handlers"],
      ["service-gen", "Service Generation", "Domain services"],
      ["runtime-ref", "Runtime Ref", "Mirrors runtime backend worker"],
    ),
    "backend",
    ["build", "backend"]
  ),
  buildWorker(
    "bw-database",
    "Database Build Worker",
    "beta",
    "Produces schemas, migrations, and seed data from venture entities.",
    cap(
      ["schema-gen", "Schema Generation", "Prisma/Supabase schemas"],
      ["migration-gen", "Migration Generation", "SQL migrations"],
    ),
    "database",
    ["build", "database"]
  ),
  buildWorker(
    "bw-deployment",
    "Deployment Build Worker",
    "beta",
    "Packages deploy configs for Vercel, Docker, and CI pipelines.",
    cap(
      ["vercel-deploy", "Vercel Deploy", "Serverless packaging"],
      ["docker-pack", "Docker Pack", "Container images"],
      ["runtime-ref", "Runtime Ref", "Mirrors runtime deployment worker"],
    ),
    "deployment",
    ["build", "deployment"]
  ),
  buildWorker(
    "bw-qa",
    "QA Build Worker",
    "beta",
    "Generates test suites, accessibility audits, and contract tests.",
    cap(
      ["e2e-gen", "E2E Generation", "Playwright specs"],
      ["a11y-gen", "A11y Generation", "Accessibility audits"],
      ["runtime-ref", "Runtime Ref", "Mirrors runtime QA worker"],
    ),
    "qa",
    ["build", "qa"]
  ),
  buildWorker(
    "bw-architecture",
    "Architecture Build Worker",
    "stable",
    "Synthesizes system design, API contracts, and stack selection.",
    cap(
      ["system-design", "System Design", "Architecture documents"],
      ["api-contracts", "API Contracts", "OpenAPI-style specs"],
      ["stack-select", "Stack Selection", "Technology recommendations"],
    ),
    "architecture",
    ["build", "architecture"]
  ),
  buildWorker(
    "bw-ux",
    "UX Build Worker",
    "beta",
    "Transforms PRD flows into wireframes and FHIS screen scaffolds.",
    cap(
      ["wireframe-gen", "Wireframe Generation", "Screen layouts"],
      ["flow-gen", "Flow Generation", "User flow diagrams"],
      ["runtime-ref", "Runtime Ref", "Mirrors runtime UX worker"],
    ),
    "design",
    ["build", "ux"]
  ),
];

export function createBuildWorkerRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerMany(registry, OFFICIAL_BUILD_WORKERS);
  return registry;
}

export function registerBuildWorkers(target: BuildRegistry): RegistryEntry[] {
  return registerMany(target, OFFICIAL_BUILD_WORKERS);
}
