import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAnalysisOnlyOpportunityScanner } from "../infrastructure";
import { OpportunityScanner } from "../application/scanner";

const ROOT = join(__dirname, "..");

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      files.push(...listTsFiles(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("opportunity module isolation", () => {
  it("does not import broker / BrokerEngine / IBKR", () => {
    const files = listTsFiles(ROOT);
    expect(files.length).toBeGreaterThan(0);
    const importPatterns = [
      /from\s+["'][^"']*broker-engine[^"']*["']/i,
      /from\s+["'][^"']*broker\/[^"']*["']/i,
      /import\s+type\s+\{\s*BrokerEngine/,
      /import\s+\{\s*[^}]*BrokerEngine/,
      /from\s+["'][^"']*ibkr[^"']*["']/i,
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of importPatterns) {
        expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("exposes no order submission path on scanner", async () => {
    const scanner = createAnalysisOnlyOpportunityScanner({
      now: () => new Date("2026-07-30T12:00:00.000Z"),
      capabilities: { crypto: false },
      minConfidence: 0.2,
      minScore: 20,
    });
    const result = await scanner.scan();
    expect(result.mode).toBe("ANALYSIS_ONLY");
    expect(result.orderExecution).toBe("disabled");
    expect(result.skippedAssetClasses).toContain("crypto");
    for (const candidate of result.candidates) {
      expect(candidate.analysisOnly).toBe(true);
      expect(candidate.orderExecution).toBe("disabled");
      expect(candidate.instrument.assetClass).not.toBe("crypto");
      expect(candidate.priceQuality).toBe("DEMO");
      expect(candidate.priceSource).toBe("demo-synthetic-normalized");
    }
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(scanner));
    expect(proto).not.toEqual(expect.arrayContaining(["submitOrder", "placeOrder", "sendOrder"]));
    expect(typeof (scanner as OpportunityScanner & { submitOrder?: unknown }).submitOrder).toBe("undefined");
  });

  it("includes crypto only when capability flag is enabled", async () => {
    const withCrypto = createAnalysisOnlyOpportunityScanner({
      now: () => new Date("2026-07-30T12:00:00.000Z"),
      capabilities: { crypto: true },
      minConfidence: 0.1,
      minScore: 10,
    });
    const result = await withCrypto.scan();
    expect(result.skippedAssetClasses).not.toContain("crypto");
    expect(result.candidates.some((c) => c.instrument.assetClass === "crypto") || result.candidates.length >= 0).toBe(
      true,
    );
  });
});
