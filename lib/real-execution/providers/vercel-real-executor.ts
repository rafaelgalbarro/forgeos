/** ForgeOS RC5.3 — Vercel controlled real executor. */

import {
  isVercelConfigured,
  listVercelProjects,
  validateVercelConnection,
} from "@/lib/connections/vercel/client";
import { canExecuteProviderReal } from "@/lib/real-build-flow/execution-flags";
import { normalizeProviderResult } from "./provider-result-normalizer";
import type { NormalizedProviderResult } from "./provider-result-normalizer";

export interface VercelRealExecutionInput {
  ventureName: string;
  approved: boolean;
}

export async function executeVercelControlledReal(
  input: VercelRealExecutionInput
): Promise<{ results: NormalizedProviderResult[]; rollbackSteps: string[] }> {
  const rollbackSteps = [
    "Remove preview deployment from Vercel dashboard",
    "Unlink preview project if created",
  ];

  if (!canExecuteProviderReal("vercel") || !input.approved) {
    return {
      results: [
        normalizeProviderResult({
          provider: "vercel",
          success: true,
          executed: false,
          mode: "dry_run",
          output: "[DRY-RUN] Vercel — validate token and list projects only",
          warnings: ["No production deploy in RC5.3"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }

  if (!isVercelConfigured()) {
    return {
      results: [
        normalizeProviderResult({
          provider: "vercel",
          success: false,
          executed: false,
          mode: "sandbox",
          output: "VERCEL_TOKEN not configured",
          errors: ["Missing credential"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }

  try {
    await validateVercelConnection();
    const projects = await listVercelProjects();
    const previewPlan = {
      projectName: input.ventureName.toLowerCase().replace(/\s+/g, "-"),
      target: "preview",
      production: false,
    };

    return {
      results: [
        normalizeProviderResult({
          provider: "vercel",
          success: true,
          executed: false,
          mode: "sandbox",
          output: `Token valid. ${projects.length} project(s). Preview plan prepared.`,
          data: {
            projectCount: projects.length,
            previewPlan,
            projects: projects.slice(0, 5).map((p) => ({ name: p.name, id: p.id })),
          },
          warnings: ["Preview project creation plan only — no production deploy"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Vercel validation failed";
    return {
      results: [
        normalizeProviderResult({
          provider: "vercel",
          success: false,
          executed: false,
          mode: "sandbox",
          output: msg,
          errors: [msg],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }
}
