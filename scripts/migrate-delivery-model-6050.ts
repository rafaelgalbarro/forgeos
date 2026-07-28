/**
 * PROGRAM 6050 — Non-destructive migration runner.
 * Run: npx tsx scripts/migrate-delivery-model-6050.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  migrateDeliveryModel,
  formatMigrationReport,
  DELIVERY_MODEL_VERSION,
} from "../src/core/delivery";
import type { CreationOutput } from "../lib/creation-output/types";
import type { CodeProject } from "../lib/code-generation/types";

async function loadLegacySamples(): Promise<{
  outputs: CreationOutput[];
  projects: CodeProject[];
}> {
  try {
    const { buildAllOutputs } = await import("../lib/creation-output/output-builder");
    const outputs = await buildAllOutputs({
      missionId: "mission-6050-migrate-sample",
      ventureSlug: "nexora-field",
      ventureName: "Nexora Field",
      ideaText: "Nexora Field migration sample",
    });
    return { outputs, projects: [] };
  } catch {
    return { outputs: [], projects: [] };
  }
}

async function main() {
  console.log(DELIVERY_MODEL_VERSION);
  console.log("▸ Non-destructive migration (legacy stores untouched)\n");

  const { outputs, projects } = await loadLegacySamples();

  const result = migrateDeliveryModel({
    missionId: "mission-6050-migrate-sample",
    creationOutputs: outputs,
    codeProjects: projects,
    orphanLegacyIds:
      outputs.length === 0
        ? [{ system: "creation-output", id: "placeholder-orphan" }]
        : [],
  });

  const text = formatMigrationReport(result.report);
  console.log(text);

  const outDir = join(process.cwd(), "tmp");
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, "migration-6050-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        report: result.report,
        artifactCount: result.artifacts.length,
        outputCount: result.outputs.length,
        codebaseCount: result.codebases.length,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nReport written: ${reportPath}`);
  console.log("Legacy data was NOT deleted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
