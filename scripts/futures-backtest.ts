/**
 * Kraken Futures backtest — native shorts, IS/OOS (75d), PF_XBTUSD + PF_ETHUSD.
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/futures-backtest.ts
 */

import fs from "node:fs";
import path from "node:path";
import { runFullFuturesBacktest } from "../lib/trading/crypto/futures-backtest-runner";
import { sendTelegramMessage } from "../lib/notifications/telegram-bot";

const ROOT = process.env.FORGEOS_ROOT?.trim() || path.resolve(__dirname, "..");

function telegramSummary(markdown: string, reportPath: string): string {
  const gateSection = markdown.split("## OOS live gate")[1]?.split("##")[0] ?? "";
  const rows = gateSection
    .split("\n")
    .filter((l) => l.startsWith("| PF_"))
    .slice(0, 12);
  return [
    "📊 <b>Futures backtest</b> (75d IS/OOS)",
    `Report: ${path.basename(reportPath)}`,
    rows.length ? rows.join("\n") : "(sin filas OOS — revisar markdown)",
  ].join("\n");
}

async function main(): Promise<void> {
  console.log("[FuturesBT] starting full strategy backtest…");
  const result = await runFullFuturesBacktest();
  const reportDir = path.join(ROOT, ".forgeos", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outFile = path.join(reportDir, `futures-backtest-${date}.md`);
  fs.writeFileSync(outFile, result.markdown, "utf8");
  console.log(
    `[FuturesBT] wrote ${outFile} trades=${result.trades.length} IS=${result.trades.filter((t) => t.sample === "IS").length} OOS=${result.trades.filter((t) => t.sample === "OOS").length} gate=${result.reportPath}`,
  );
  await sendTelegramMessage(telegramSummary(result.markdown, result.reportPath)).catch(
    (err) => {
      console.warn(
        "[FuturesBT] telegram:",
        err instanceof Error ? err.message : err,
      );
    },
  );
}

main().catch((err) => {
  console.error("[FuturesBT]", err instanceof Error ? err.message : err);
  process.exit(1);
});
