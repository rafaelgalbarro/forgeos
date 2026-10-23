/**
 * One daily Telegram summary (22:00 Madrid) covering OANDA, IB and Kraken:
 * today's real buys/sells (trade ledger) + balance / day P&L per platform.
 * Driven by the forex-bot loop (always running); sent once per Madrid day.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { madridDay, readTradeMessages } from "@/lib/notifications/trade-ledger";

const SUMMARY_HOUR = Math.min(23, Math.max(0, Number(process.env.TELEGRAM_SUMMARY_HOUR_MADRID ?? 22) || 22));

function root(): string {
  return process.env.FORGEOS_ROOT || process.cwd();
}

function sentFile(): string {
  const d = path.join(root(), ".forgeos", "telegram-trades");
  fs.mkdirSync(d, { recursive: true });
  return path.join(d, "summary-sent.json");
}

function madridHour(at = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(at)) % 24;
}

const f2 = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

export async function buildDailySummary(day = madridDay()): Promise<string> {
  const rows = readTradeMessages(day);
  const count = (p: string) => rows.filter((r) => r.platform === p).length;
  const lines: string[] = [`📊 <b>Resumen del día ${day}</b>`];

  // OANDA (forex bot via MT5)
  try {
    const { mt5Account, mt5Configured } = await import("@/lib/forex-bot/mt5");
    const { loadFxTrades } = await import("@/lib/forex-bot/journal");
    const real = loadFxTrades().filter((t) => t.mode !== "shadow");
    const closedToday = real.filter((t) => t.closedAt && madridDay(new Date(t.closedAt)) === day);
    const pnl = closedToday.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const open = real.filter((t) => !t.closedAt).length;
    let bal = "";
    if (mt5Configured()) {
      const a = await mt5Account().catch(() => null);
      if (a) bal = ` · saldo ${a.balance.toFixed(2)} ${a.currency} (equidad ${a.equity.toFixed(2)})`;
    }
    lines.push(`\n💱 <b>OANDA</b>: ${count("OANDA")} avisos · cerradas ${closedToday.length} (${f2(pnl)} €) · abiertas ${open}${bal}`);
  } catch (err) {
    lines.push(`\n💱 <b>OANDA</b>: sin datos (${err instanceof Error ? err.message.slice(0, 60) : err})`);
  }

  // IB
  try {
    const { fetchTradingAccountSnapshot } = await import("@/lib/trading/ibkr-data");
    const s = await fetchTradingAccountSnapshot();
    lines.push(
      `📈 <b>IB</b>: ${count("IB")} avisos · P&L día ${f2(s.dailyPnlUSD)} · NAV ${s.combinedNav.toFixed(2)} · posiciones ${s.openPositionsCount}`,
    );
  } catch (err) {
    lines.push(`📈 <b>IB</b>: ${count("IB")} avisos · sin datos de cuenta (${err instanceof Error ? err.message.slice(0, 60) : err})`);
  }

  // Kraken futures
  try {
    const f = JSON.parse(fs.readFileSync(path.join(root(), ".forgeos", "cache", "kraken-futures-daily-risk.json"), "utf8")) as {
      dayKey: string; dayStartCapital: number; dayPnl: number;
    };
    const today = f.dayKey === day;
    lines.push(
      `₿ <b>Kraken</b>: ${count("KRAKEN")} avisos · P&L día ${today ? f2(f.dayPnl) : "0.00"} $ · margen ${(f.dayStartCapital + (today ? f.dayPnl : 0)).toFixed(2)} $`,
    );
  } catch {
    lines.push(`₿ <b>Kraken</b>: ${count("KRAKEN")} avisos · sin datos de cuenta`);
  }

  if (rows.length) {
    lines.push("\n<b>Operaciones de hoy</b>");
    for (const r of rows.slice(-15)) {
      const hh = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date(r.at));
      lines.push(`${hh} ${r.text.split("\n")[0]!.slice(0, 110)}`);
    }
  } else {
    lines.push("\nHoy no ha habido compras ni ventas.");
  }
  return lines.join("\n");
}

/** Call often (e.g. every minute): sends the summary once per day after SUMMARY_HOUR Madrid. */
export async function maybeSendDailySummary(now = new Date()): Promise<boolean> {
  if (madridHour(now) < SUMMARY_HOUR) return false;
  const day = madridDay(now);
  let last = "";
  try { last = (JSON.parse(fs.readFileSync(sentFile(), "utf8")) as { day: string }).day; } catch { /* first time */ }
  if (last === day) return false;
  fs.writeFileSync(sentFile(), JSON.stringify({ day, at: now.toISOString() }));
  const text = await buildDailySummary(day);
  await sendTelegramMessage(text, undefined, { kind: "summary" });
  return true;
}
