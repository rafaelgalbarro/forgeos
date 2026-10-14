/**
 * Rolling stocks-cycle stats → Telegram 22:15 Europe/Madrid.
 */

import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

type DayBucket = {
  dayKey: string;
  analyzed: number;
  discardReasons: Record<string, number>;
  signals: number;
  ordersSent: number;
  ordersFilled: number;
  accountLabel: string | null;
};

let bucket: DayBucket | null = null;
let scheduler: ReturnType<typeof setInterval> | null = null;
let lastSentDay = "";

function madridDayKey(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const mo = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${mo}-${d}`;
}

function ensureBucket(): DayBucket {
  const dayKey = madridDayKey();
  if (!bucket || bucket.dayKey !== dayKey) {
    bucket = {
      dayKey,
      analyzed: 0,
      discardReasons: {},
      signals: 0,
      ordersSent: 0,
      ordersFilled: 0,
      accountLabel: null,
    };
  }
  return bucket;
}

export function recordStocksCycleSummary(params: {
  analyzed: number;
  signals: number;
  ordersSent: number;
  ordersFilled: number;
  accountLabel?: string | null;
  discardByReason?: Record<string, number>;
}): void {
  const b = ensureBucket();
  b.analyzed += params.analyzed;
  b.signals += params.signals;
  b.ordersSent += params.ordersSent;
  b.ordersFilled += params.ordersFilled;
  if (params.accountLabel) b.accountLabel = params.accountLabel;
  for (const [reason, n] of Object.entries(params.discardByReason ?? {})) {
    if (!n) continue;
    const key = reason.slice(0, 72);
    b.discardReasons[key] = (b.discardReasons[key] ?? 0) + n;
  }
}

function topDiscards(map: Record<string, number>, n = 8): string[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([r, c]) => `· ${c}× ${r}`);
}

export async function sendStocksDailyTelegramSummary(): Promise<void> {
  const b = ensureBucket();
  const lines = [
    "📊 <b>Stocks diario 22:15 Madrid</b>",
    `Analizados: ${b.analyzed}`,
    `Señales: ${b.signals} | órdenes enviadas: ${b.ordersSent} | filled: ${b.ordersFilled}`,
    b.accountLabel ? `Cuenta: ${b.accountLabel}` : "",
  ].filter(Boolean);
  const tops = topDiscards(b.discardReasons);
  if (tops.length) {
    lines.push("Descartes (agrupados):");
    lines.push(...tops);
  }
  await sendTelegramMessage(lines.join("\n"));
}

export function startStocksDailyTelegramScheduler(): void {
  if (scheduler) return;
  const tick = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const mi = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const dayKey = madridDayKey();
    if (h === 22 && mi >= 15 && mi < 20 && lastSentDay !== dayKey) {
      lastSentDay = dayKey;
      void sendStocksDailyTelegramSummary().catch((err) => {
        console.warn(
          "[Stocks/Daily]",
          err instanceof Error ? err.message : err,
        );
      });
    }
  };
  tick();
  scheduler = setInterval(tick, 60_000);
  scheduler.unref?.();
}
