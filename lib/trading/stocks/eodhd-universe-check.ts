/**
 * Startup validation: every executable equity has an EODHD price.
 */

import fs from "node:fs";
import path from "node:path";
import { getQuote } from "@/lib/market-data/eodhd";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { europeEurSeedSymbols, getEuropeanEurEquity } from "@/lib/trading/europe-equities";
import { USA_EXECUTABLE_EQUITIES } from "@/lib/trading/usa-sectors";

let validatedDay = "";

function todayMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function validateExecutableUniverseEodhd(): Promise<string[]> {
  const missing: string[] = [];
  const us = [...USA_EXECUTABLE_EQUITIES];
  const eu = europeEurSeedSymbols();
  const tickers = [...new Set([...us, ...eu])];

  for (const sym of tickers) {
    const eu = getEuropeanEurEquity(sym);
    const code = eu?.eodhd ?? sym;
    try {
      const q = await getQuote(code);
      if (!(q.price > 0)) missing.push(sym);
    } catch {
      missing.push(sym);
    }
  }
  return missing.sort();
}

/** Once per Madrid day on startup — Telegram if any ticker lacks EODHD price. */
const EODHD_CHECK_DAY_FILE = path.join(process.cwd(), ".forgeos", "cache", "eodhd-universe-check-day.txt");

export async function runStartupEodhdUniverseCheck(): Promise<void> {
  const day = todayMadrid();
  if (validatedDay === day) return;
  validatedDay = day;
  // Persisted: restarts/deploys during the day must not re-send the same Telegram.
  try {
    if (fs.existsSync(EODHD_CHECK_DAY_FILE) && fs.readFileSync(EODHD_CHECK_DAY_FILE, "utf8").trim() === day) return;
    fs.mkdirSync(path.dirname(EODHD_CHECK_DAY_FILE), { recursive: true });
    fs.writeFileSync(EODHD_CHECK_DAY_FILE, day, "utf8");
  } catch {
    /* best effort */
  }
  const missing = await validateExecutableUniverseEodhd();
  if (!missing.length) {
    console.log(`[EODHD/Universe] ok (${todayMadrid()})`);
    return;
  }
  const msg =
    `⚠️ <b>EODHD sin precio</b> (${missing.length} tickers)\n` +
    missing.slice(0, 40).join(", ") +
    (missing.length > 40 ? "…" : "");
  console.warn(`[EODHD/Universe] missing: ${missing.join(", ")}`);
  await sendTelegramMessage(msg).catch(() => undefined);
}
