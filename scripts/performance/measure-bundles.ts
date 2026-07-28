/**
 * PROGRAM 6100 — Measure JS bundle sizes from Next build output.
 */
import fs from "node:fs";
import path from "node:path";

export interface BundleMeasurement {
  file: string;
  sizeBytes: number;
  gzipEstimateBytes: number;
}

function walkDir(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full, ext));
    else if (entry.name.endsWith(ext)) files.push(full);
  }
  return files;
}

export function measureBundles(): { totalJsBytes: number; files: BundleMeasurement[] } {
  const staticDir = path.join(process.cwd(), ".next", "static");
  const jsFiles = walkDir(staticDir, ".js");
  const files: BundleMeasurement[] = jsFiles.map((file) => {
    const stat = fs.statSync(file);
    return {
      file: path.relative(process.cwd(), file),
      sizeBytes: stat.size,
      gzipEstimateBytes: Math.round(stat.size * 0.35),
    };
  });
  const totalJsBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  return { totalJsBytes, files };
}

async function main() {
  const result = measureBundles();
  const outDir = path.join(process.cwd(), "artifacts", "performance");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "bundles.json"),
    JSON.stringify({ measuredAt: new Date().toISOString(), ...result }, null, 2),
  );
  console.log(`Total JS: ${result.totalJsBytes} bytes across ${result.files.length} files`);
}

if (require.main === module) {
  main();
}
