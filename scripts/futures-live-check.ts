/**
 * Pre-live Kraken Futures check: flex margin, 1× leverage, post-only + stop place/cancel.
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/futures-live-check.ts
 *   npx tsx ... scripts/futures-live-check.ts --what-if   # read-only + leverage only
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
import { futuresMaxLeverage } from "../lib/trading/crypto/futures-config";

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
  const whatIf = process.argv.includes("--what-if");
  const cap = futuresMaxLeverage();
  console.log(
    `[FuturesLive] base=${krakenFuturesRestBase()} demo=${isKrakenFuturesDemoMode()} levCap=${cap}`,
  );

  if (!isKrakenFuturesConfigured()) {
    console.error("Missing KRAKEN_FUTURES_* keys");
    process.exit(1);
  }

  const adapter = getKrakenFuturesAdapter();
  const acct = await adapter.getAccount();
  console.log(
    `[FuturesLive] flex availableMargin=${acct.availableMargin} balance=${acct.balanceValue} ${acct.currency}`,
  );

  const pf = spotPairToPfSymbol("XBTEUR")!;
  await adapter.setLeverage(pf, cap);
  const lev = await adapter.getMaxLeveragePreference(pf);
  console.log(`[FuturesLive] ${pf} maxLeverage on exchange=${lev}`);
  if (lev != null && lev > cap) {
    console.error(`[FuturesLive] FAIL leverage ${lev} > cap ${cap}`);
    process.exit(1);
  }

  if (whatIf) {
    console.log("[FuturesLive] OK (what-if — no order test)");
    return;
  }

  const q = await adapter.getQuote(pf);
  const sizing = await adapter.sizeForNotionalEur(pf, 25, q.bid);
  if (!sizing) {
    console.error("[FuturesLive] size below minimum — skip order leg");
    process.exit(1);
  }
  const stop = q.bid * 0.985;
  const entry = await adapter.enterWithExchangeStop({
    symbol: pf,
    side: "buy",
    size: sizing.size,
    limitPrice: q.bid * 0.998,
    stopPrice: stop,
    postOnly: true,
  });
  console.log(`[FuturesLive] entry=${entry.orderId} stop=${entry.stopOrderId}`);
  await new Promise((r) => setTimeout(r, 2_500));
  if (entry.orderId) await adapter.cancelOrder(entry.orderId).catch(() => undefined);
  if (entry.stopOrderId) await adapter.cancelOrder(entry.stopOrderId).catch(() => undefined);
  console.log("[FuturesLive] OK — orders cancelled");
}

main().catch((err) => {
  console.error("[FuturesLive] FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
