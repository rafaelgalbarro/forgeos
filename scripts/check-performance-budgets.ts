/**
 * PROGRAM 6100 — Check performance budgets against baseline.
 */
import fs from "node:fs";
import path from "node:path";
import { REGRESSION_TOLERANCES, PERFORMANCE_BUDGETS } from "@/src/core/performance/config/budgets";
import { generatePerformanceReport } from "./performance/performance-report";

interface Regression {
  metric: string;
  baseline: number;
  current: number;
  deltaPercent: number;
  severity: "warning" | "critical";
}

function loadJson(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function checkRegression(
  metric: string,
  baseline: number,
  current: number,
  tolerancePercent: number,
): Regression | null {
  if (baseline === 0) return null;
  const deltaPercent = ((current - baseline) / baseline) * 100;
  if (deltaPercent <= tolerancePercent) return null;
  return {
    metric,
    baseline,
    current,
    deltaPercent: Math.round(deltaPercent * 100) / 100,
    severity: deltaPercent > tolerancePercent * 2 ? "critical" : "warning",
  };
}

function main() {
  const perfDir = path.join(process.cwd(), "artifacts", "performance");
  const baseline = loadJson(path.join(perfDir, "baseline.json"));
  const current = generatePerformanceReport();

  const regressions: Regression[] = [];

  if (baseline) {
    const baseBundles = (baseline as { bundles?: { totalJsBytes?: number } }).bundles?.totalJsBytes ?? 0;
    const curBundles = current.bundles.totalJsBytes;
    const bundleReg = checkRegression("totalJsBytes", baseBundles, curBundles, REGRESSION_TOLERANCES.bundleSizePercent);
    if (bundleReg) regressions.push(bundleReg);

    const baseMem = (baseline as { memory?: { heapUsedMb?: number } }).memory?.heapUsedMb ?? 0;
    const memReg = checkRegression("heapUsedMb", baseMem, current.memory.heapUsedMb, REGRESSION_TOLERANCES.memoryPercent);
    if (memReg) regressions.push(memReg);

    const baseInit = (baseline as { compositionRoot?: { coldInitMs?: number } }).compositionRoot?.coldInitMs ?? 0;
    const initReg = checkRegression("coldInitMs", baseInit, current.compositionRoot.coldInitMs, REGRESSION_TOLERANCES.routeLatencyPercent);
    if (initReg) regressions.push(initReg);
  }

  for (const q of current.queries) {
    if (q.durationMs > PERFORMANCE_BUDGETS.cachedReadModelMs && q.query.includes("cached")) {
      regressions.push({
        metric: q.query,
        baseline: PERFORMANCE_BUDGETS.cachedReadModelMs,
        current: q.durationMs,
        deltaPercent: 0,
        severity: "warning",
      });
    }
  }

  const result = {
    checkedAt: new Date().toISOString(),
    budgets: PERFORMANCE_BUDGETS,
    regressions,
    passed: regressions.filter((r) => r.severity === "critical").length === 0,
  };

  fs.mkdirSync(perfDir, { recursive: true });
  fs.writeFileSync(path.join(perfDir, "budget-check.json"), JSON.stringify(result, null, 2));

  console.log(JSON.stringify(result, null, 2));

  if (!result.passed) {
    console.error("CRITICAL performance regressions detected");
    process.exit(1);
  }
}

main();
