/**
 * Dedicated EODHD US WebSocket writer (PM2: forgeos-eodhd-us-ws).
 * Single /ws/us-quote connection per API key — publishes to .forgeos/cache/eodhd-us-ws-store.json.
 */

import { isEodhdConfigured } from "@/lib/market-data/eodhd";
import {
  getEodhdWsStatus,
  startEodhdUsMarketData,
} from "@/lib/market-data/eodhd-ws-client";
import { isUsEodhdWsSession } from "@/lib/trading/exchange-hours";

const startedAt = new Date().toISOString();

function tickStatus(): void {
  const st = getEodhdWsStatus();
  if (!isUsEodhdWsSession()) {
    console.log("[EODHD/WS/Engine] outside US WS window — idle");
    return;
  }
  console.log(
    `[EODHD/WS/Engine] us-quote=${st.quoteConnected} subs=${st.subscribed} ` +
      `symbols=${st.symbols.length} lastMsgAgeMs=${st.lastMsgAgeMs}`,
  );
}

async function main(): Promise<void> {
  if (!isEodhdConfigured()) {
    console.error("[EODHD/WS/Engine] EODHD_API_KEY missing — exit");
    process.exit(1);
  }

  console.log(`[EODHD/WS/Engine] boot pid=${process.pid} startedAt=${startedAt}`);
  startEodhdUsMarketData();

  setInterval(tickStatus, 60_000);
  tickStatus();

  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
}

void main();
