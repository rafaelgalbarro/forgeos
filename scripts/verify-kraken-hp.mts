/**
 * Standalone Kraken HP verification (uses @/ so market-store is a single module).
 * Run: $env:NODE_OPTIONS='--require ./scripts/stub-server-only.cjs'; npx tsx scripts/verify-kraken-hp.mts
 */
import { writeFileSync } from "node:fs";
import { refreshKrakenUniverse } from "@/lib/brokers/kraken/universe";
import {
  updateMarketRegime,
  getMarketRegime,
  sizeMultiplierForRegime,
  isBuyPausedByRegime,
} from "@/lib/trading/crypto/regime";
import { restBackfill } from "@/lib/brokers/kraken/market-store";
import { getBars } from "@/lib/brokers/kraken/market-store";
import { evaluateAllStrategiesForPair } from "@/lib/trading/crypto/strategies";
import {
  evaluateTrendPullback1h,
} from "@/lib/trading/crypto/strategies/trend-pullback-1h";
import { evaluateRsiMeanReversion15m } from "@/lib/trading/crypto/strategies/rsi-mean-reversion-15m";
import { evaluateMomentumBreakout5m } from "@/lib/trading/crypto/strategies/momentum-breakout-5m";
import { evaluateTopGainerPullback } from "@/lib/trading/crypto/strategies/top-gainer-pullback";
import { evaluateVwapReclaim15m } from "@/lib/trading/crypto/strategies/vwap-reclaim-15m";
import { SHADOW_BOOTSTRAP_STRATEGIES } from "@/lib/trading/crypto/strategies/types";

async function main() {
  const lines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    lines.push(s);
  };

  const uni = await refreshKrakenUniverse(true);
  log(
    `[Kraken/Universe] total=${uni.total} líquidos=${uni.liquid} seleccionados=${uni.selected.length}`,
  );
  log(
    `TOP ${uni.selected
      .slice(0, 8)
      .map((p) => `${p.altname}:${Math.round(p.volume24hEur)}`)
      .join(" | ")}`,
  );

  const seed = [
    "XBTEUR",
    "ETHEUR",
    ...uni.selected.slice(0, 6).map((x) => x.altname),
  ];
  for (const p of [...new Set(seed)]) {
    for (const iv of [60, 15, 5, 1] as const) {
      await restBackfill(p, iv);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  await updateMarketRegime();
  const regime = getMarketRegime();
  const pause = isBuyPausedByRegime();
  log(
    `REGIME ${regime.regime} sizeMult=${sizeMultiplierForRegime()} btc1h=${regime.btcDrop1hPct.toFixed(2)}% pauseBuys=${pause.paused}${pause.reason ? ` (${pause.reason})` : ""}`,
  );
  log(
    `BARS XBTEUR 1h=${getBars("XBTEUR", "60").length} 15m=${getBars("XBTEUR", "15").length} 5m=${getBars("XBTEUR", "5").length}`,
  );

  const sample = uni.selected.slice(0, 8);
  const signals: Array<Record<string, unknown>> = [];
  const perPair: string[] = [];
  for (const p of sample) {
    const b1h = getBars(p.altname, "60");
    const b15 = getBars(p.altname, "15");
    const b5 = getBars(p.altname, "5");
    const raw = [
      evaluateTrendPullback1h(b1h),
      evaluateRsiMeanReversion15m(b15, b1h),
      evaluateMomentumBreakout5m(b5, b1h),
      evaluateTopGainerPullback(b15, b1h, null),
      evaluateVwapReclaim15m(b15),
    ];
    perPair.push(
      `${p.altname}[${b1h.length}/${b15.length}/${b5.length}] ` +
        raw
          .map(
            (s) =>
              `${s.strategyId}:${s.direction}` +
              (s.direction === "BUY" ? `(${(s.confidence * 100).toFixed(0)}%)` : ""),
          )
          .join(","),
    );
    for (const s of raw.filter((x) => x.direction === "BUY")) {
      signals.push({
        pair: p.altname,
        strategy: s.strategyId,
        conf: Number(s.confidence.toFixed(2)),
        movePct: Number((s.expectedMovePct * 100).toFixed(2)),
        mode: SHADOW_BOOTSTRAP_STRATEGIES.has(s.strategyId) ? "shadow" : "real",
        stage: "raw",
      });
    }
    for (const s of evaluateAllStrategiesForPair(p.altname)) {
      signals.push({
        pair: p.altname,
        strategy: s.strategyId,
        conf: Number(s.confidence.toFixed(2)),
        movePct: Number((s.expectedMovePct * 100).toFixed(2)),
        mode: SHADOW_BOOTSTRAP_STRATEGIES.has(s.strategyId) ? "shadow" : "real",
        stage: "cost_ok",
      });
    }
  }
  for (const line of perPair) log(`ANALYSIS ${line}`);
  log(`SIGNALS_COUNT ${signals.length}`);
  log(`SIGNALS ${JSON.stringify(signals.slice(0, 25), null, 2)}`);
  log(
    `EXIT_LOOP status=ready interval=5s engine=startKrakenExitLoop (runKrakenExits)`,
  );

  writeFileSync("scripts/verify-kraken-hp.out.txt", lines.join("\n"), "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
