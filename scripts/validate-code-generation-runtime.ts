/**
 * PROGRAM 5360 — Runtime E2E validation for code generation.
 * Run: npx tsx scripts/validate-code-generation-runtime.ts
 */

import { runNexoraFieldCodeE2EPipeline, runGenericFixtureValidation } from "../lib/code-generation/e2e-nexora-pipeline";

async function main() {
  console.log("▸ Running NEXORA FIELD code E2E pipeline…\n");
  const result = await runNexoraFieldCodeE2EPipeline();

  console.log("Projects:", result.projects.length);
  console.log("File counts:", result.fileCounts);
  console.log("Validations:", result.validations);
  console.log("Exports:", result.exports);
  console.log("Duration:", result.totalDurationMs, "ms");
  console.log("Mode:", result.generationMode);
  console.log("Generic fixture:", result.genericFixturePassed);

  const generic = await runGenericFixtureValidation();
  console.log("Generic file count:", generic.fileCount);

  const allOk =
    result.allPassed &&
    result.projects.length === 4 &&
    result.exports.every((e) => e.zipValid) &&
    generic.passed;

  console.log(allOk ? "\n✓ PROGRAM 5360 E2E PASSED" : "\n✗ PROGRAM 5360 E2E FAILED");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
