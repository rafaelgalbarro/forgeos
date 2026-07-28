/**
 * PROGRAM 6100 — Aggregate performance report.
 */
import fs from "node:fs";
import path from "node:path";
import { measureBundles } from "./measure-bundles";
import { measureQueries } from "./measure-queries";
import { measureMemory } from "./measure-memory";
import { measureCompositionRootInit } from "@/src/core/performance/composition/measure-init";
import { PERFORMANCE_BUDGETS } from "@/src/core/performance/config/budgets";

export interface PerformanceReport {
  generatedAt: string;
  budgets: typeof PERFORMANCE_BUDGETS;
  bundles: ReturnType<typeof measureBundles>;
  queries: ReturnType<typeof measureQueries>;
  memory: ReturnType<typeof measureMemory>;
  compositionRoot: ReturnType<typeof measureCompositionRootInit>;
  routes?: unknown;
}

export function generatePerformanceReport(): PerformanceReport {
  const perfDir = path.join(process.cwd(), "artifacts", "performance");
  let routes: unknown;
  const routesFile = path.join(perfDir, "routes.json");
  if (fs.existsSync(routesFile)) {
    routes = JSON.parse(fs.readFileSync(routesFile, "utf8"));
  }

  return {
    generatedAt: new Date().toISOString(),
    budgets: PERFORMANCE_BUDGETS,
    bundles: measureBundles(),
    queries: measureQueries(),
    memory: measureMemory(),
    compositionRoot: measureCompositionRootInit(),
    routes,
  };
}

async function main() {
  const report = generatePerformanceReport();
  const outDir = path.join(process.cwd(), "artifacts", "performance");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

  const baselinePath = path.join(outDir, "baseline.json");
  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, JSON.stringify(report, null, 2));
    console.log("Created baseline.json");
  }

  console.log("Performance report generated:", path.join(outDir, "report.json"));
}

if (require.main === module) {
  main();
}
