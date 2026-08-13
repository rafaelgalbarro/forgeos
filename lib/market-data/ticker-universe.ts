import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getBatchPrices } from "@/lib/market-data/yahoo-finance";
import { allEuropeTickers, isEuropeTicker } from "@/lib/market-data/europe-indices";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "ticker-universe.json");

export type UniverseSource =
  | "SP500"
  | "NASDAQ"
  | "NYSE"
  | "RUSSELL2000"
  | "EUROPE"
  | "MERGED";

export type TickerUniverseCache = {
  updatedAt: string;
  nextRefreshAt: string;
  sources: Record<UniverseSource, number>;
  tickers: string[];
  filteredCount: number;
};

function scannerEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function scannerNum(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function getScannerConfig() {
  return {
    universe: scannerEnv("SCAN_UNIVERSE", "ALL").toUpperCase(),
    minPrice: scannerNum("MIN_PRICE", 0.1),
    minVolume: scannerNum("MIN_VOLUME", 100_000),
    maxSpreadPct: scannerNum("MAX_SPREAD_PCT", 1),
    maxPhase2: scannerNum("MAX_TICKERS_PHASE2", 50),
    maxPhase3: scannerNum("MAX_TICKERS_PHASE3", 10),
  };
}

function isUsTickerSymbol(symbol: string): boolean {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return false;
  if (symbol.includes(".")) return false;
  if (symbol.endsWith("F") && symbol.length > 4) return false;
  return true;
}

function isValidUniverseSymbol(symbol: string): boolean {
  const upper = symbol.trim().toUpperCase();
  if (isEuropeTicker(upper)) return true;
  if (/\.(VI|OL|IR|AT)$/.test(upper)) return true;
  return isUsTickerSymbol(upper);
}

async function fetchSp500(): Promise<string[]> {
  const url = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv";
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`S&P500 CSV HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).slice(1);
  const out: string[] = [];
  for (const line of lines) {
    const sym = line.split(",")[0]?.trim().toUpperCase();
    if (sym && isUsTickerSymbol(sym)) out.push(sym);
  }
  return out;
}

async function fetchNasdaqScreener(exchange?: "nasdaq" | "nyse"): Promise<string[]> {
  const params = new URLSearchParams({ tableonly: "true", limit: "5000" });
  if (exchange) params.set("exchange", exchange);
  const url = `https://api.nasdaq.com/api/screener/stocks?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (ForgeOS Investment Scanner)",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`NASDAQ screener HTTP ${res.status}`);
  const data = (await res.json()) as {
    data?: { rows?: Array<{ symbol?: string }> };
  };
  return (data.data?.rows ?? [])
    .map((r) => String(r.symbol ?? "").trim().toUpperCase())
    .filter(isUsTickerSymbol);
}

async function fetchRussell2000(): Promise<string[]> {
  const url =
    "https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/1467271812596.ajax?fileType=csv&fileName=IWM_holdings&dataType=fund";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ForgeOS Investment Scanner)", Accept: "text/csv" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const out: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const cols = line.split(",");
      const raw = (cols[0] ?? "").replace(/"/g, "").trim().toUpperCase();
      if (isUsTickerSymbol(raw)) out.push(raw);
    }
    return [...new Set(out)];
  } catch {
    return [];
  }
}

const ISHARES_EXCHANGE_SUFFIX: Record<string, string> = {
  XETRA: ".DE",
  "DEUTSCHE BOERSE AG": ".DE",
  "LONDON STOCK EXCHANGE": ".L",
  "EURONEXT PARIS": ".PA",
  "BOLSA DE MADRID": ".MC",
  "MADRID STOCK EXCHANGE": ".MC",
  "SIX SWISS EXCHANGE": ".SW",
  "EURONEXT AMSTERDAM": ".AS",
  "BORSA ITALIANA": ".MI",
  "NASDAQ COPENHAGEN": ".CO",
  "NASDAQ STOCKHOLM": ".ST",
  "NASDAQ HELSINKI": ".HE",
  "EURONEXT BRUSSELS": ".BR",
  "EURONEXT LISBON": ".LS",
  "WIENER BOERSE": ".VI",
  "OSLO BORS": ".OL",
  "IRISH STOCK EXCHANGE": ".IR",
  "ATHENS STOCK EXCHANGE": ".AT",
};

function mapIsharesEuropeTicker(ticker: string, exchange: string): string | null {
  const t = ticker.replace(/\s+/g, "-").replace(/\./g, "-").toUpperCase();
  if (!t || t === "TICKER" || t.includes("ISIN")) return null;
  const ex = exchange.replace(/"/g, "").trim().toUpperCase();
  const suffix = ISHARES_EXCHANGE_SUFFIX[ex];
  if (!suffix) return null;
  const yahoo = `${t}${suffix}`;
  return isEuropeTicker(yahoo) || /\.(VI|OL|IR|AT)$/.test(yahoo) ? yahoo : null;
}

async function fetchStoxx600(): Promise<string[]> {
  const url =
    "https://www.ishares.com/uk/individual/en/products/251931/ishares-stoxx-europe-600-ucits-etf/1506575573208.ajax?fileType=csv&fileName=EXSA_holdings&dataType=fund";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ForgeOS Investment Scanner)", Accept: "text/csv" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return [...allEuropeTickers()];
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const headerIdx = lines.findIndex((l) => /ticker/i.test(l.split(",")[0] ?? "") && /exchange/i.test(l));
    const start = headerIdx >= 0 ? headerIdx + 1 : 0;
    const header = (headerIdx >= 0 ? lines[headerIdx] : "").split(",").map((c) => c.replace(/"/g, "").trim().toLowerCase());
    const tickerIdx = Math.max(0, header.indexOf("ticker"));
    const exchIdx = header.indexOf("exchange") >= 0 ? header.indexOf("exchange") : 10;
    const out: string[] = [];
    for (const line of lines.slice(start)) {
      const cols = line.split(",").map((c) => c.replace(/"/g, "").trim());
      const mapped = mapIsharesEuropeTicker(cols[tickerIdx] ?? "", cols[exchIdx] ?? "");
      if (mapped) out.push(mapped);
    }
    const merged = [...new Set([...allEuropeTickers(), ...out])];
    return merged.length ? merged : allEuropeTickers();
  } catch {
    return allEuropeTickers();
  }
}

function spreadPct(q: { price: number; bid: number; ask: number }): number {
  if (q.price <= 0) return 99;
  const bid = q.bid > 0 ? q.bid : q.price;
  const ask = q.ask > 0 ? q.ask : q.price;
  return (Math.abs(ask - bid) / q.price) * 100;
}

async function fetchNyseFallback(): Promise<string[]> {
  try {
    return await fetchNasdaqScreener("nyse");
  } catch {
    const url =
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=undervalued_large_caps&count=250";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ForgeOS)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
    };
    return (data.finance?.result?.[0]?.quotes ?? [])
      .map((q) => String(q.symbol ?? "").trim().toUpperCase())
      .filter(isUsTickerSymbol);
  }
}

function nextRefreshIso(): string {
  const now = new Date();
  const madrid = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const y = Number(madrid.find((p) => p.type === "year")?.value ?? "2026");
  const m = Number(madrid.find((p) => p.type === "month")?.value ?? "1") - 1;
  const d = Number(madrid.find((p) => p.type === "day")?.value ?? "1");
  const h = Number(madrid.find((p) => p.type === "hour")?.value ?? "0");
  let target = new Date(Date.UTC(y, m, d, 8 - 2, 0, 0));
  if (h >= 8) target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  return target.toISOString();
}

function readCache(): TickerUniverseCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as TickerUniverseCache;
  } catch {
    return null;
  }
}

function writeCache(payload: TickerUniverseCache): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function filterByLiquidity(tickers: string[]): Promise<string[]> {
  const cfg = getScannerConfig();
  const unique = [...new Set(tickers)];
  const passed: string[] = [];
  let quotesOk = 0;
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const quotes = await getBatchPrices(chunk);
    quotesOk += quotes.size;
    for (const sym of chunk) {
      const q = quotes.get(sym);
      if (!q) continue;
      if (q.price < cfg.minPrice) continue;
      if (q.volume < cfg.minVolume && q.avgVolume < cfg.minVolume) continue;
      if (spreadPct(q) > cfg.maxSpreadPct) continue;
      const ex = (q.exchange ?? "").toUpperCase();
      if (!isEuropeTicker(sym) && (ex.includes("OTC") || ex.includes("PINK"))) continue;
      passed.push(sym);
    }
  }

  // Yahoo quote batches often 401/empty — never wipe a downloaded universe to [].
  if (passed.length === 0 && unique.length > 0) {
    console.warn(
      `[TickerUniverse] liquidity filter returned 0 (quotesOk=${quotesOk}/${unique.length}) — keeping raw symbols`,
    );
    return unique;
  }
  return passed;
}

/** Returns cached universe or refreshes if stale (daily 8:00 AM Madrid). */
export async function getTickerUniverse(force = false): Promise<TickerUniverseCache> {
  const cached = readCache();
  if (
    !force &&
    cached &&
    cached.tickers.length > 0 &&
    new Date(cached.nextRefreshAt).getTime() > Date.now()
  ) {
    return cached;
  }
  // Stale empty cache must not block refresh forever.
  if (!force && cached && cached.tickers.length === 0) {
    console.warn("[TickerUniverse] Ignoring empty cached universe — forcing refresh");
  }

  const cfg = getScannerConfig();
  console.log(`[TickerUniverse] Refreshing universe mode=${cfg.universe}…`);

  const sources: Record<UniverseSource, number> = {
    SP500: 0,
    NASDAQ: 0,
    NYSE: 0,
    RUSSELL2000: 0,
    EUROPE: 0,
    MERGED: 0,
  };
  let raw: string[] = [];

  if (cfg.universe === "SP500") {
    raw = await fetchSp500();
    sources.SP500 = raw.length;
  } else if (cfg.universe === "NASDAQ") {
    raw = await fetchNasdaqScreener("nasdaq");
    sources.NASDAQ = raw.length;
  } else if (cfg.universe === "NYSE") {
    raw = await fetchNyseFallback();
    sources.NYSE = raw.length;
  } else if (cfg.universe === "EUROPE") {
    raw = await fetchStoxx600();
    sources.EUROPE = raw.length;
  } else {
    const [sp500, nasdaq, nyse, russell, europe] = await Promise.all([
      fetchSp500().catch(() => [] as string[]),
      fetchNasdaqScreener("nasdaq").catch(() => [] as string[]),
      fetchNyseFallback().catch(() => [] as string[]),
      fetchRussell2000().catch(() => [] as string[]),
      fetchStoxx600().catch(() => allEuropeTickers()),
    ]);
    sources.SP500 = sp500.length;
    sources.NASDAQ = nasdaq.length;
    sources.NYSE = nyse.length;
    sources.RUSSELL2000 = russell.length;
    sources.EUROPE = europe.length;
    raw = [...sp500, ...nasdaq, ...nyse, ...russell, ...europe];
  }

  const merged = [...new Set(raw.map((s) => s.trim().toUpperCase()).filter(isValidUniverseSymbol))];
  sources.MERGED = merged.length;

  const filtered = await filterByLiquidity(merged);

  // Never persist an empty universe when we had symbols — keep prior good cache if any.
  if (filtered.length === 0 && merged.length === 0 && cached?.tickers?.length) {
    console.warn(
      `[TickerUniverse] Refresh produced 0 tickers — reusing previous cache (${cached.tickers.length})`,
    );
    return cached;
  }

  const payload: TickerUniverseCache = {
    updatedAt: new Date().toISOString(),
    nextRefreshAt: nextRefreshIso(),
    sources,
    tickers: filtered,
    filteredCount: filtered.length,
  };
  if (payload.tickers.length > 0 || !cached?.tickers?.length) {
    writeCache(payload);
  }
  console.log(
    `[TickerUniverse] OK ${filtered.length} tickers (raw ${merged.length}) — next refresh ${payload.nextRefreshAt}`,
  );
  return payload;
}
