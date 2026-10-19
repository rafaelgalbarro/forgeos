import "server-only";

import { sendSystemTelegramAlert } from "@/lib/notifications/telegram-policy";
import type { StocksInPlayDayList } from "@/lib/trading/stocks-in-play/types";
import { getStocksInPlayMode } from "@/lib/trading/stocks-in-play/config";
import { madridDayKey } from "@/lib/trading/stocks-in-play/store";

let lastDigestDay = "";

export async function sendStocksInPlayDailyTelegram(list: StocksInPlayDayList): Promise<void> {
  const day = madridDayKey();
  if (lastDigestDay === day) return;
  lastDigestDay = day;
  const lines = list.symbols.slice(0, 15).map((s, i) => {
    const m = s.metrics;
    return `${i + 1}. <b>${s.symbol}</b> $${m.price.toFixed(2)} · ${s.reason}`;
  });
  const body =
    `📋 <b>Stocks in play</b> (${list.dayKey}) mode=${getStocksInPlayMode()}\n` +
    (lines.length ? lines.join("\n") : "· (sin candidatos)") +
    `\n<i>screened ${list.screened} → ${list.symbols.length}</i>`;
  await sendSystemTelegramAlert("stocks_in_play_daily", body);
}
