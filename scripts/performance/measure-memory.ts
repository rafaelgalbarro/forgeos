/**
 * PROGRAM 6100 — Measure memory usage.
 */
import fs from "node:fs";
import path from "node:path";

export interface MemoryMeasurement {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
}

export function measureMemory(): MemoryMeasurement {
  const mem = process.memoryUsage();
  return {
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
  };
}

async function main() {
  const result = measureMemory();
  const outDir = path.join(process.cwd(), "artifacts", "performance");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "memory.json"), JSON.stringify({ measuredAt: new Date().toISOString(), ...result }, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main();
}
