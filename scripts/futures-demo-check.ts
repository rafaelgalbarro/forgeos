/**
 * Kraken Futures demo/live connectivity + order lifecycle smoke test.
 *
 * Uses KRAKEN_FUTURES_DEMO_* when set, else production keys (still shadow-safe:
 * only posts/cancels on demo URL when demo keys present).
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/futures-demo-check.ts
 *   npx tsx ... scripts/futures-demo-check.ts --send-test-order
 */

import fs from "node:fs";
import path from "node:path";
import {
  getKrakenFuturesAdapter,
  isKrakenFuturesConfigured,
  isKrakenFuturesDemoMode,
  krakenFuturesRestBase,
  spotPairToPfSymbol,
} from "../lib/brokers/kraken-futures";

function loadEnvLocal(): void {
  const root = process.cwd();
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(process.env[key] ?? "").trim()) process.env[key] = val;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const sendOrder = process.argv.includes("--send-test-order");
  console.log(`[FuturesDemo] base=${krakenFuturesRestBase()} demo=${isKrakenFuturesDemoMode()}`);

  if (!isKrakenFuturesConfigured()) {
    console.error("Missing KRAKEN_FUTURES_* or KRAKEN_FUTURES_DEMO_* keys");
    process.exit(1);
  }

  const adapter = getKrakenFuturesAdapter();
  const acct = await adapter.getAccount();
  console.log(
    `[FuturesDemo] flex availableMargin=${acct.availableMargin} balance=${acct.balanceValue} ${acct.currency}`,
  );
  const fees = await adapter.getFees();
  console.log(
    `[FuturesDemo] fees maker=${(fees.makerPct * 100).toFixed(3)}% taker=${(fees.takerPct * 100).toFixed(3)}% source=${fees.source}`,
  );

  const pf = spotPairToPfSymbol("XBTEUR")!;
  const q = await adapter.getQuote(pf);
  console.log(`[FuturesDemo] ${pf} mid=$${q.mid} funding=${q.fundingRate}`);

  const meta = await adapter.getInstrument(pf);
  console.log(`[FuturesDemo] min precision=${meta?.contractValueTradePrecision}`);

  if (!sendOrder) {
    console.log("[FuturesDemo] OK (read-only). Pass --send-test-order for post-only+stop test.");
    return;
  }

  const sizing = await adapter.sizeForNotionalEur(pf, 25, q.bid);
  if (!sizing) {
    console.error("[FuturesDemo] size below minimum — skip order test");
    return;
  }
  const stop = q.bid * 0.98;
  const entry = await adapter.enterWithExchangeStop({
    symbol: pf,
    side: "buy",
    size: sizing.size,
    limitPrice: q.bid * 0.999,
    stopPrice: stop,
    postOnly: true,
  });
  console.log(`[FuturesDemo] entry=${entry.orderId} stop=${entry.stopOrderId}`);
  if (entry.orderId) {
    await new Promise((r) => setTimeout(r, 3_000));
    await adapter.cancelOrder(entry.orderId).catch(() => undefined);
  }
  if (entry.stopOrderId) {
    await adapter.cancelOrder(entry.stopOrderId).catch(() => undefined);
  }
  console.log("[FuturesDemo] order test cancelled");
}

main().catch((err) => {
  console.error("[FuturesDemo] FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
