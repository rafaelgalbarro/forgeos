/**
 * Adopt ForgeOS Kraken positions missing from crypto-trades.jsonl
 * (legacy trades.jsonl + ClosedOrders userref + TradesHistory).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getKrakenAdapter } from "@/lib/brokers/kraken/adapter";
import { normalizeKrakenPair, pairFromBase } from "@/lib/brokers/kraken/pairs";
import { forgeosKrakenUserref } from "@/lib/brokers/kraken/userref";
import {
  appendCryptoJournal,
  journalOpenCryptoPairs,
  readCryptoJournal,
} from "@/lib/trading/crypto/journal-crypto";
import { readJournalTrades } from "@/lib/trading/journal/trades";

export type ReconcileResult = {
  adopted: number;
  ignored: number;
  pairs: string[];
};

function normPair(raw: string): string {
  const u = raw.trim().toUpperCase().replace("/", "");
  return normalizeKrakenPair(u) ?? u;
}

function pairFromTicker(ticker: string): string | null {
  const t = ticker.trim().toUpperCase().replace("/", "");
  if (t.endsWith("EUR")) return normPair(t);
  if (t === "BTC" || t === "XBT") return "XBTEUR";
  if (t === "ETH") return "ETHEUR";
  if (t === "SOL") return "SOLEUR";
  if (t === "ADA") return "ADAEUR";
  return pairFromBase(t) ?? (t.length <= 5 ? `${t}EUR` : null);
}

/** Max hold by strategy (ms) — mirrors engine exits. */
export function maxHoldMsForStrategy(strategy: string): number {
  if (strategy === "TOP_GAINER_PULLBACK") return 12 * 3600_000;
  if (strategy === "MOMENTUM_BREAKOUT_5M") return 4 * 3600_000;
  return 24 * 3600_000;
}

type LegacyOpen = {
  pair: string;
  strategy: string;
  entry: number;
  at: string;
  source: "crypto-journal" | "trades-jsonl" | "kraken-userref";
};

function openFromCryptoJournal(): Map<string, LegacyOpen> {
  const map = new Map<string, LegacyOpen>();
  const open = new Set<string>();
  for (const t of readCryptoJournal(20_000)) {
    if (t.shadow) continue;
    const p = normPair(t.pair);
    if (t.side === "BUY") {
      open.add(p);
      map.set(p, {
        pair: p,
        strategy: String(t.strategy || "TREND_PULLBACK_1H"),
        entry: t.entry > 0 ? t.entry : 0,
        at: t.at,
        source: "crypto-journal",
      });
    }
    if (t.side === "SELL") {
      open.delete(p);
      map.delete(p);
    }
  }
  return map;
}

function openFromLegacyTradesJsonl(): Map<string, LegacyOpen> {
  const map = new Map<string, LegacyOpen>();
  const open = new Set<string>();
  for (const t of readJournalTrades(20_000)) {
    if (t.market !== "crypto" || t.shadow) continue;
    const pair = pairFromTicker(t.ticker);
    if (!pair) continue;
    if (t.side === "BUY") {
      open.add(pair);
      map.set(pair, {
        pair,
        strategy: String(t.strategy || "TREND_PULLBACK_1H"),
        entry: t.entry > 0 ? t.entry : 0,
        at: t.at,
        source: "trades-jsonl",
      });
    }
    if (t.side === "SELL") {
      open.delete(pair);
      map.delete(pair);
    }
  }
  return map;
}

export async function reconcileKrakenForgeOsPositions(): Promise<ReconcileResult> {
  const adapter = getKrakenAdapter();
  const userref = forgeosKrakenUserref();
  const already = journalOpenCryptoPairs();
  const cryptoOpen = openFromCryptoJournal();
  const legacyOpen = openFromLegacyTradesJsonl();

  // ClosedOrders with ForgeOS userref → forgeos-owned pairs
  const closed = await adapter.getClosedOrdersByUserref(userref).catch(() => []);
  const userrefBuys = new Map<string, LegacyOpen>();
  for (const o of closed) {
    if (o.side !== "buy") continue;
    const pair = normPair(o.pair);
    if (!pair) continue;
    const at = o.opentm
      ? new Date(o.opentm * 1000).toISOString()
      : new Date().toISOString();
    userrefBuys.set(pair, {
      pair,
      strategy: "TREND_PULLBACK_1H",
      entry: o.avgPrice > 0 ? o.avgPrice : o.price,
      at,
      source: "kraken-userref",
    });
  }

  const positions = await adapter.getPositions().catch(() => []);
  let adopted = 0;
  let ignored = 0;
  const adoptedPairs: string[] = [];

  for (const pos of positions) {
    const pair = normPair(pos.symbol);
    const base = pos.base.toUpperCase();
    if (!(pos.qty > 0)) continue;

    // Already tracked in crypto journal
    if (
      [...already].some(
        (s) => s === pair || s.startsWith(base) || pair.startsWith(s.replace(/EUR$/, "")),
      )
    ) {
      continue;
    }

    const candidate =
      cryptoOpen.get(pair) ??
      legacyOpen.get(pair) ??
      userrefBuys.get(pair) ??
      [...legacyOpen.values()].find(
        (c) => c.pair.replace(/EUR$/, "") === base || c.pair === pair,
      ) ??
      [...userrefBuys.values()].find(
        (c) => c.pair.replace(/EUR$/, "") === base || c.pair === pair,
      );

    if (!candidate) {
      ignored += 1;
      console.log(
        `[Kraken/Reconcile] ignorada ${pair} qty=${pos.qty} (saldo ajeno / sin rastro ForgeOS)`,
      );
      continue;
    }

    const entry = candidate.entry > 0 ? candidate.entry : pos.avgEntryPrice;
    appendCryptoJournal({
      at: candidate.at,
      strategy: candidate.strategy,
      pair,
      regime: "RECONCILED",
      side: "BUY",
      entry,
      exit: null,
      exitReason: null,
      grossPnlEur: null,
      feesEur: 0,
      netPnlEur: null,
      durationMs: null,
      mfePct: null,
      maePct: null,
      shadow: false,
      open: true,
    });
    adopted += 1;
    adoptedPairs.push(pair);
    already.add(pair);
    console.log(
      `[Kraken/Reconcile] adoptada ${pair} entry=€${entry.toFixed(4)} strategy=${candidate.strategy} source=${candidate.source}`,
    );
  }

  // Persist marker so we don't spam adopt logs every restart without positions change
  try {
    const marker = path.join(
      process.cwd(),
      ".forgeos",
      "cache",
      "kraken-reconcile-last.json",
    );
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(
      marker,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          adopted,
          ignored,
          pairs: adoptedPairs,
          userref,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    /* ignore */
  }

  console.log(
    `[Kraken/Reconcile] adoptadas=${adopted} ignoradas=${ignored} (saldos ajenos)`,
  );
  return { adopted, ignored, pairs: adoptedPairs };
}
