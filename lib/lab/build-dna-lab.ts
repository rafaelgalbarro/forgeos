/** Lab harness for Build DNA (Epic 6.1) — isolated from production routes. */

import { buildDna } from "@/lib/build-platform/build-dna/dna-builder";
import { validateBuildDna } from "@/lib/build-platform/build-dna/dna-validator";
import type { BuildDna, BuildDnaOverrides, BuildDnaValidationResult } from "@/lib/build-platform/build-dna/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export interface BuildDnaLabProfile {
  id: string;
  name: string;
  description: string;
  overrides?: BuildDnaOverrides;
}

export interface BuildDnaLabSession {
  ventureId: string;
  getDna(): BuildDna;
  getValidation(): BuildDnaValidationResult;
  getProfiles(): BuildDnaLabProfile[];
  switchProfile(profileId: string): void;
  getActiveProfile(): BuildDnaLabProfile;
}

const MOCK_PROFILES: BuildDnaLabProfile[] = [
  {
    id: "default",
    name: "ForgeOS Defaults",
    description: "Platform defaults — full stack, DDD + Clean + Hexagonal.",
  },
  {
    id: "fleetpulse",
    name: "FleetPulse EV",
    description: "SaaS fleet management — Supabase + Stripe + PostHog.",
    overrides: {
      stack: {
        framework: "Next.js 15 (App Router)",
        backend: "Next.js API Routes + Edge Functions",
        database: "PostgreSQL (Supabase)",
        payments: "Stripe Billing",
        analytics: "PostHog + custom fleet metrics",
        monitoring: "Sentry + Datadog APM",
      },
      architecture: {
        architecture: "Domain-driven modular monolith — Fleet, Vehicle, Telemetry bounded contexts",
        performanceBudget: { maxBundleKb: 300, maxLcpMs: 2000, maxApiLatencyMs: 400 },
      },
      branding: {
        primaryColor: "#0d9488",
        fontFamily: "DM Sans, Inter, sans-serif",
        rules: ["EV-green accent for sustainability metrics", "Dashboard-first UX for fleet managers"],
      },
    },
  },
  {
    id: "incomplete",
    name: "Incomplete DNA",
    description: "Missing stack fields — validation should fail.",
    overrides: {
      stack: {
        framework: "",
        backend: "",
        frontend: "",
        database: "",
        auth: "",
        payments: "",
        email: "",
        analytics: "",
        testing: "",
        cicd: "",
        deployment: "",
        monitoring: "",
      },
      security: { rules: [] },
      deployment: { environments: [], rollbackStrategy: "" },
    },
  },
];

function profileForId(id: string): BuildDnaLabProfile {
  return MOCK_PROFILES.find((p) => p.id === id) ?? MOCK_PROFILES[0];
}

export function createBuildDnaLab(
  ventureId: string = LAB_MOCK_VENTURE_ID,
  profileId = "fleetpulse",
): BuildDnaLabSession {
  const venture = createLabMockVenture();
  let activeProfileId = profileId;

  function assemble(): BuildDna {
    const profile = profileForId(activeProfileId);
    return buildDna({
      ventureId,
      ventureName: venture.name,
      overrides: profile.overrides,
    });
  }

  return {
    ventureId,
    getDna: assemble,
    getValidation: () => validateBuildDna(assemble()),
    getProfiles: () => [...MOCK_PROFILES],
    switchProfile: (id: string) => {
      activeProfileId = id;
    },
    getActiveProfile: () => profileForId(activeProfileId),
  };
}

export function listBuildDnaLabProfiles(): BuildDnaLabProfile[] {
  return [...MOCK_PROFILES];
}
