import "server-only";

import fs from "node:fs";
import path from "node:path";

export type InstitutionalBadge =
  | "INSIDER BUY"
  | "SHORT SQUEEZE"
  | "OPTIONS FLOW"
  | "CATALYST"
  | "MACRO CAUTION"
  | "GAP UP"
  | "GAP DOWN"
  | "MOMENTUM";

export type InstitutionalScanResult = {
  ticker: string;
  scannedAt: string;
  scoreDelta: number;
  badges: InstitutionalBadge[];
  signals: string[];
  insiderBuyToday: boolean;
  insiderSellToday: boolean;
  shortInterestPct: number | null;
  optionsPremiumUsd: number | null;
  eightKPositive: boolean;
  eightKNegative: boolean;
  macroCaution24h: boolean;
};

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const SHORT_INTEREST_CACHE = path.join(CACHE_DIR, "finra-short-interest.json");
const MACRO_CACHE = path.join(CACHE_DIR, "macro-events-24h.json");

const POSITIVE_8K = /beat|buyback|repurchase|merger|acquisition|approved|dividend increase|partnership|upgrade/i;
const NEGATIVE_8K = /lawsuit|litigation|resign|departure|guidance down|recall|investigation|bankruptcy|delist|downgrade/i;
const MACRO_KEYWORDS = /federal reserve|fomc|cpi|consumer price|nonfarm|nfp|jobs report|gdp|pce|interest rate decision/i;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": "ForgeOS Investment Scanner contact@forgeos.local",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function searchSecFilings(ticker: string, form: "4" | "8-K"): Promise<string[]> {
  const start = todayIso();
  const end = tomorrowIso();
  const url =
    `https://efts.sec.gov/LATEST/search-index?q="${encodeURIComponent(ticker)}"` +
    `&dateRange=custom&startdt=${start}&enddt=${end}&forms=${encodeURIComponent(form)}`;
  const data = await fetchJson<{ hits?: { hits?: Array<{ _source?: { display_names?: string[]; file_date?: string; file_description?: string } }> } }>(url);
  const hits = data?.hits?.hits ?? [];
  return hits.map((h) => {
    const src = h._source;
    const names = (src?.display_names ?? []).join(" ");
    return `${names} ${src?.file_description ?? ""}`.trim();
  });
}

function detectInsiderActivity(snippets: string[]): { buy: boolean; sell: boolean } {
  let buy = false;
  let sell = false;
  for (const text of snippets) {
    const upper = text.toUpperCase();
    if (/P\b| PURCHASE| ACQUIRED| BUY/.test(upper)) buy = true;
    if (/S\b| SALE| SOLD| DISPOSED| SELL/.test(upper)) sell = true;
  }
  return { buy, sell };
}

function detect8KSentiment(snippets: string[]): { positive: boolean; negative: boolean } {
  let positive = false;
  let negative = false;
  for (const text of snippets) {
    if (POSITIVE_8K.test(text)) positive = true;
    if (NEGATIVE_8K.test(text)) negative = true;
  }
  return { positive, negative };
}

type ShortInterestRow = { symbol?: string; currentShortPositionQuantity?: number; averageDailyVolumeQuantity?: number };

async function loadShortInterestMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    if (fs.existsSync(SHORT_INTEREST_CACHE)) {
      const cached = JSON.parse(fs.readFileSync(SHORT_INTEREST_CACHE, "utf8")) as {
        updatedAt: string;
        rows: ShortInterestRow[];
      };
      const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
      if (ageMs < 7 * 24 * 60 * 60 * 1000) {
        for (const row of cached.rows) {
          const sym = String(row.symbol ?? "").toUpperCase();
          const shortQty = Number(row.currentShortPositionQuantity ?? 0);
          const adv = Number(row.averageDailyVolumeQuantity ?? 0);
          if (sym && adv > 0) map.set(sym, (shortQty / adv) * 100);
        }
        return map;
      }
    }
  } catch {
    /* refresh below */
  }

  const url = "https://api.finra.org/data/group/otcMarket/name/consolidatedShortInterest?limit=5000";
  const rows = await fetchJson<ShortInterestRow[]>(url);
  if (!rows?.length) return map;

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    SHORT_INTEREST_CACHE,
    JSON.stringify({ updatedAt: new Date().toISOString(), rows }, null, 2),
    "utf8",
  );

  for (const row of rows) {
    const sym = String(row.symbol ?? "").toUpperCase();
    const shortQty = Number(row.currentShortPositionQuantity ?? 0);
    const adv = Number(row.averageDailyVolumeQuantity ?? 0);
    if (sym && adv > 0) map.set(sym, (shortQty / adv) * 100);
  }
  return map;
}

async function fetchOptionsFlowPremium(ticker: string): Promise<number | null> {
  const key = process.env.UNUSUAL_WHALES_API_KEY?.trim();
  if (!key) return null;
  const url = `https://api.unusualwhales.com/api/option-trades/ticker/${encodeURIComponent(ticker)}`;
  const data = await fetchJson<{ data?: Array<{ premium?: number; size?: number }> }>(url, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!data?.data?.length) return null;
  let maxPremium = 0;
  for (const trade of data.data) {
    const premium = Number(trade.premium ?? 0);
    if (premium > maxPremium) maxPremium = premium;
  }
  return maxPremium > 0 ? maxPremium : null;
}

/** Soft 24h macro caution flag (cached) — used by Opportunities + pre-trade soft notes. */
export async function getInstitutionalMacroCaution24h(): Promise<boolean> {
  return loadMacroCautionFlag();
}

async function loadMacroCautionFlag(): Promise<boolean> {
  try {
    if (fs.existsSync(MACRO_CACHE)) {
      const cached = JSON.parse(fs.readFileSync(MACRO_CACHE, "utf8")) as { updatedAt: string; caution: boolean };
      if (Date.now() - new Date(cached.updatedAt).getTime() < 6 * 60 * 60 * 1000) {
        return cached.caution;
      }
    }
  } catch {
    /* refresh */
  }

  const from = todayIso();
  const url = `https://www.econdb.com/api/events/?format=json&date_from=${from}`;
  const data = await fetchJson<Array<{ event?: string; title?: string; date?: string }>>(url);
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  let caution = false;

  for (const ev of data ?? []) {
    const label = `${ev.event ?? ""} ${ev.title ?? ""}`;
    if (!MACRO_KEYWORDS.test(label)) continue;
    const when = ev.date ? new Date(ev.date).getTime() : now;
    if (when >= now && when <= in24h) {
      caution = true;
      break;
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    MACRO_CACHE,
    JSON.stringify({ updatedAt: new Date().toISOString(), caution }, null, 2),
    "utf8",
  );
  return caution;
}

/** Institutional signals for one ticker — scores and badges for Opportunities. */
export async function scanInstitutionalSignals(ticker: string): Promise<InstitutionalScanResult> {
  const upper = ticker.trim().toUpperCase();
  const badges: InstitutionalBadge[] = [];
  const signals: string[] = [];
  let scoreDelta = 0;

  const [form4, form8k, shortMap, optionsPremium, macroCaution] = await Promise.all([
    searchSecFilings(upper, "4"),
    searchSecFilings(upper, "8-K"),
    loadShortInterestMap(),
    fetchOptionsFlowPremium(upper),
    loadMacroCautionFlag(),
  ]);

  const insider = detectInsiderActivity(form4);
  if (insider.buy) {
    scoreDelta += 25;
    badges.push("INSIDER BUY");
    signals.push("Form 4: compra insider hoy (+25)");
  }
  if (insider.sell) {
    scoreDelta -= 20;
    signals.push("Form 4: venta insider hoy (-20)");
  }

  const shortPct = shortMap.get(upper) ?? null;
  if (shortPct != null && shortPct > 20) {
    scoreDelta += 15;
    badges.push("SHORT SQUEEZE");
    signals.push(`Short interest ${shortPct.toFixed(1)}% float (+15 squeeze)`);
  }

  if (optionsPremium != null && optionsPremium >= 500_000) {
    scoreDelta += 20;
    badges.push("OPTIONS FLOW");
    signals.push(`Bloque opciones $${(optionsPremium / 1000).toFixed(0)}k premium (+20)`);
  }

  const eightK = detect8KSentiment(form8k);
  if (eightK.positive) {
    scoreDelta += 15;
    badges.push("CATALYST");
    signals.push("8-K positivo hoy (+15)");
  }
  if (eightK.negative) {
    scoreDelta -= 15;
    signals.push("8-K negativo hoy (-15)");
  }

  if (macroCaution) {
    badges.push("MACRO CAUTION");
    signals.push("Evento macro en próximas 24h — precaución");
  }

  return {
    ticker: upper,
    scannedAt: new Date().toISOString(),
    scoreDelta,
    badges,
    signals,
    insiderBuyToday: insider.buy,
    insiderSellToday: insider.sell,
    shortInterestPct: shortPct,
    optionsPremiumUsd: optionsPremium,
    eightKPositive: eightK.positive,
    eightKNegative: eightK.negative,
    macroCaution24h: macroCaution,
  };
}

/** Batch enrich opportunities with institutional scoring. */
export async function enrichOpportunitiesWithInstitutional<T extends { ticker: string; score: number; signals: readonly string[] }>(
  opportunities: T[],
): Promise<Array<T & Pick<InstitutionalScanResult, "badges" | "macroCaution24h"> & { score: number; signals: string[] }>> {
  const out: Array<T & Pick<InstitutionalScanResult, "badges" | "macroCaution24h"> & { score: number; signals: string[] }> = [];

  for (const opp of opportunities) {
    try {
      const inst = await scanInstitutionalSignals(opp.ticker);
      out.push({
        ...opp,
        score: Math.max(0, Math.min(100, Math.round(opp.score + inst.scoreDelta))),
        signals: [...opp.signals, ...inst.signals],
        badges: inst.badges,
        macroCaution24h: inst.macroCaution24h,
      });
    } catch (err) {
      console.warn(
        `[InstitutionalScanner] ${opp.ticker}:`,
        err instanceof Error ? err.message : err,
      );
      out.push({ ...opp, signals: [...opp.signals], badges: [], macroCaution24h: false });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}
