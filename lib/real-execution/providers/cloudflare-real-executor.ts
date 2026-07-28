/** ForgeOS RC5.3 — Cloudflare controlled real executor (validation only). */

import {
  isCloudflareConfigured,
  listCloudflareZones,
  validateCloudflareConnection,
} from "@/lib/connections/cloudflare/client";
import { canExecuteProviderReal } from "@/lib/real-build-flow/execution-flags";
import { normalizeProviderResult } from "./provider-result-normalizer";
import type { NormalizedProviderResult } from "./provider-result-normalizer";

export interface CloudflareRealExecutionInput {
  ventureName: string;
  approved: boolean;
}

export async function executeCloudflareControlledReal(
  input: CloudflareRealExecutionInput
): Promise<{ results: NormalizedProviderResult[]; rollbackSteps: string[] }> {
  const rollbackSteps = ["No DNS changes applied — plan only", "Discard DNS plan document"];

  const dnsPlan = {
    records: [
      { type: "CNAME", name: "preview", content: "cname.vercel-dns.com", proxied: false },
    ],
    apply: false,
  };

  if (!canExecuteProviderReal("cloudflare") || !input.approved) {
    return {
      results: [
        normalizeProviderResult({
          provider: "cloudflare",
          success: true,
          executed: false,
          mode: "dry_run",
          output: "[DRY-RUN] Cloudflare DNS plan prepared — no apply",
          data: { dnsPlan },
          warnings: ["DNS apply blocked in RC5.3"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }

  if (!isCloudflareConfigured()) {
    return {
      results: [
        normalizeProviderResult({
          provider: "cloudflare",
          success: false,
          executed: false,
          mode: "sandbox",
          output: "CLOUDFLARE_API_TOKEN not configured",
          errors: ["Missing credential"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }

  try {
    await validateCloudflareConnection();
    const zones = await listCloudflareZones();

    return {
      results: [
        normalizeProviderResult({
          provider: "cloudflare",
          success: true,
          executed: false,
          mode: "sandbox",
          output: `Token valid. ${zones.length} zone(s). DNS plan generated.`,
          data: {
            zoneCount: zones.length,
            zones: zones.slice(0, 5).map((z) => ({ name: z.name, id: z.id })),
            dnsPlan,
          },
          warnings: ["No real DNS mutations in RC5.3"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cloudflare validation failed";
    return {
      results: [
        normalizeProviderResult({
          provider: "cloudflare",
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
