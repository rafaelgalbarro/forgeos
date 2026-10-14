/**
 * Kraken Futures backtest — all strategies + mirrored shorts, IS/OOS exit tuning.
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/futures-backtest.ts
 */

import fs from "node:fs";
import path from "node:path";
import { runFullFuturesBacktest } from "../lib/trading/crypto/futures-backtest-runner";

const ROOT = process.env.FORGEOS_ROOT?.trim() || path.resolve(__dirname, "..");

async function main(): Promise<void> {
  console.log("[FuturesBT] starting full strategy backtest…");
  const result = await runFullFuturesBacktest();
  const reportDir = path.join(ROOT, ".forgeos", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outFile = path.join(reportDir, `futures-backtest-${date}.md`);
  fs.writeFileSync(outFile, result.markdown, "utf8");
  console.log(
    `[FuturesBT] wrote ${outFile} trades=${result.trades.length} IS=${result.trades.filter((t) => t.sample === "IS").length} OOS=${result.trades.filter((t) => t.sample === "OOS").length}`,
  );
}

main().catch((err) => {
  console.error("[FuturesBT]", err instanceof Error ? err.message : err);
  process.exit(1);
});
