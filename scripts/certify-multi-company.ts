/**
 * PROGRAM 6150 — Multi-company operational certification entrypoint.
 *
 * Run after sequential pipeline readiness:
 *   npm run certify:multi-company
 *
 * Produces artifacts under artifacts/certification/multi-company/
 * Exit: 0 = CERTIFIED | BLOCKED (scenario ran; gaps recorded)
 *       1 = FAILED
 */

import fs from "fs";
import path from "path";
import { runMultiCompanyCertification } from "../src/core/composition/multi-company-runtime";

async function main() {
  const outDir = path.resolve(process.cwd(), "artifacts", "certification", "multi-company");
  const result = await runMultiCompanyCertification({ outDir });

  // Mirror final-report into docs tree when docs folder exists
  const docsDir = path.resolve(process.cwd(), "docs", "v2", "multi-company-certification");
  if (fs.existsSync(docsDir)) {
    const reportSrc = path.join(outDir, "final-report.md");
    if (fs.existsSync(reportSrc)) {
      fs.copyFileSync(reportSrc, path.join(docsDir, "final-report.md"));
    }
    const certJson = path.join(outDir, "certification.json");
    if (fs.existsSync(certJson)) {
      fs.copyFileSync(certJson, path.join(docsDir, "certification-results.json"));
    }
  }

  console.log(
    JSON.stringify(
      {
        result: result.result,
        declarations: result.declarations,
        portfolioId: result.portfolio.id,
        ventureCount: result.ventures.length,
        gaps: result.gaps,
        tests: result.tests.map((t) => ({ id: t.id, status: t.status })),
        evidencePaths: result.evidencePaths,
        durationMs: result.durationMs,
      },
      null,
      2,
    ),
  );

  if (result.result === "FAILED") process.exit(1);
  // BLOCKED and CERTIFIED exit 0 so CI can archive evidence; gate on result field.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
