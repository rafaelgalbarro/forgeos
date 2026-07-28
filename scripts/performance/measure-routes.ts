/**
 * PROGRAM 6100 — Measure route response times.
 */
import fs from "node:fs";
import path from "node:path";

const ROUTES = [
  "/",
  "/mission-control",
  "/missions/demo-mission",
  "/company/demo-venture",
  "/studio/demo-mission",
  "/studio/demo-mission/code",
  "/studio/demo-mission/preview",
  "/deployments",
];

const BASE_URL = process.env.FORGEOS_BASE_URL || "http://localhost:3000";

export interface RouteMeasurement {
  route: string;
  status: number;
  ttfbMs: number;
  totalMs: number;
  responseBytes: number;
  error?: string;
}

export async function measureRoutes(): Promise<RouteMeasurement[]> {
  const results: RouteMeasurement[] = [];
  for (const route of ROUTES) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${route}`, { redirect: "follow" });
      const body = await res.text();
      const totalMs = performance.now() - start;
      results.push({
        route,
        status: res.status,
        ttfbMs: totalMs,
        totalMs,
        responseBytes: Buffer.byteLength(body, "utf8"),
      });
    } catch (err) {
      results.push({
        route,
        status: 0,
        ttfbMs: 0,
        totalMs: performance.now() - start,
        responseBytes: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

async function main() {
  const results = await measureRoutes();
  const outDir = path.join(process.cwd(), "artifacts", "performance");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "routes.json"), JSON.stringify({ measuredAt: new Date().toISOString(), routes: results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
