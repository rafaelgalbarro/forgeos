/**
 * PROGRAM 6085 — Run ATLAS CLUBS live integration via composition root.
 */
import fs from "fs";
import path from "path";
import { runAtlasClubsIntegration } from "../src/core/composition/integration-runtime";

async function main() {
  const result = await runAtlasClubsIntegration({ failOnceCapability: true });
  const outDir = path.resolve(process.cwd(), "artifacts", "v2-certification");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "atlas-clubs-run.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: result.status, missionId: result.missionId, checks: result.checks }, null, 2));
  if (result.status === "FAILED") process.exit(1);
  if (result.status === "BLOCKED") process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
