/**
 * PROGRAM 6100 — Measure segmented query performance.
 */
import fs from "node:fs";
import path from "node:path";
import {
  getMissionCard,
  getVentureCard,
  getCompanyDashboardLight,
  getOutputSummary,
  getProjectManifest,
  listPortfolioVentures,
} from "@/src/core/performance/queries/handlers";
import { measureCompositionRootInit } from "@/src/core/performance/composition/measure-init";

export interface QueryMeasurement {
  query: string;
  durationMs: number;
  resultSize: number;
  cacheHit?: boolean;
}

export function measureQueries(): QueryMeasurement[] {
  const results: QueryMeasurement[] = [];

  const queries: Array<{ name: string; fn: () => unknown }> = [
    { name: "GetMissionCard", fn: () => getMissionCard({ missionId: "demo" }) },
    { name: "GetVentureCard", fn: () => getVentureCard({ ventureId: "demo" }) },
    { name: "GetCompanyDashboard", fn: () => getCompanyDashboardLight({ ventureId: "demo" }) },
    { name: "GetOutputSummary", fn: () => getOutputSummary({ missionId: "demo", limit: 10 }) },
    { name: "GetProjectManifest", fn: () => getProjectManifest({ missionId: "demo" }) },
    { name: "ListPortfolioVentures", fn: () => listPortfolioVentures({ workspaceId: "ws-default", limit: 25 }) },
    { name: "CompositionRootInit", fn: () => measureCompositionRootInit() },
  ];

  for (const q of queries) {
    const start = performance.now();
    const result = q.fn();
    const durationMs = performance.now() - start;
    results.push({
      query: q.name,
      durationMs,
      resultSize: result ? JSON.stringify(result).length : 0,
    });
    if (q.name !== "CompositionRootInit") {
      const start2 = performance.now();
      q.fn();
      const duration2 = performance.now() - start2;
      results.push({
        query: `${q.name} (cached)`,
        durationMs: duration2,
        resultSize: result ? JSON.stringify(result).length : 0,
        cacheHit: true,
      });
    }
  }
  return results;
}

async function main() {
  const results = measureQueries();
  const outDir = path.join(process.cwd(), "artifacts", "performance");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "queries.json"), JSON.stringify({ measuredAt: new Date().toISOString(), queries: results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main();
}
