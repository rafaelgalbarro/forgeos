/**
 * PROGRAM 6100 — Measure V2 composition container init.
 */
import fs from "node:fs";
import path from "node:path";
import { measureCompositionRootInit } from "@/src/core/performance/composition/measure-init";
import { getServiceRegistry } from "@/src/core/performance/composition/lazy-services";

async function main() {
  const init = measureCompositionRootInit();
  const services = getServiceRegistry();
  const result = {
    measuredAt: new Date().toISOString(),
    init,
    services: {
      core: services.filter((s) => s.tier === "core").length,
      lazy: services.filter((s) => s.tier === "lazy").length,
      registry: services,
    },
  };
  const outDir = path.join(process.cwd(), "artifacts", "performance");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "container.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main();
