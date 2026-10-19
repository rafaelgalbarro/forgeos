import "server-only";

import { sendSystemTelegramAlert } from "@/lib/notifications/telegram-policy";
import { loadRunnerShadowWeeklyStats } from "@/lib/trading/stocks-in-play/runners/shadow-journal";
import { getStocksRunnersMode } from "@/lib/trading/stocks-in-play/runners/config";

let lastWeeklyKey = "";

export async function sendRunnersWeeklyTelegramReport(at: Date = new Date()): Promise<void> {
  const weekKey = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    week: "numeric",
  }).format(at);
  if (lastWeeklyKey === weekKey) return;
  lastWeeklyKey = weekKey;

  const stats = loadRunnerShadowWeeklyStats(at.getTime() - 7 * 24 * 60 * 60 * 1000);
  const body =
    `🏃 <b>RUNNERS weekly</b> mode=${getStocksRunnersMode()}\n` +
    `Signals: ${stats.signals} · closed: ${stats.closed}\n` +
    `Win rate: ${(stats.winRate * 100).toFixed(1)}% · mean net: $${stats.meanNetUsd.toFixed(2)}\n` +
    `<i>Live only if STOCKS_RUNNERS_MODE=live (not in-play gate)</i>`;
  await sendSystemTelegramAlert("stocks_runners_weekly", body);
}
