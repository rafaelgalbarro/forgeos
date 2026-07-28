/**
 * PROGRAM 6090 — Seed/certify ORBITA SPORTS for Company Command Center.
 */
import fs from "fs";
import path from "path";
import { runOrbitaSportsIntegration } from "../src/core/composition/orbita-sports-runtime";

async function main() {
  const result = await runOrbitaSportsIntegration();
  const outDir = path.resolve(process.cwd(), "artifacts", "v2-certification");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "orbita-sports-run.json"), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      {
        status: result.status,
        ventureId: result.ventureId,
        missionId: result.missionId,
        deploymentStatus: result.deploymentStatus,
        previewClassification: result.previewClassification,
        checks: result.checks,
        dashboardSections: result.dashboardSections,
      },
      null,
      2,
    ),
  );
  if (result.status === "FAILED") process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
