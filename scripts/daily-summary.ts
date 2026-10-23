/**
 * Sends the daily Telegram summary now (OANDA + IB + Kraken).
 *   node scripts/forex-bot.cjs summary
 */
import { buildDailySummary } from "@/lib/notifications/daily-summary";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

async function main(): Promise<void> {
  const text = await buildDailySummary();
  console.log(text.replace(/<[^>]+>/g, ""));
  const id = await sendTelegramMessage(text, undefined, { kind: "summary" });
  console.log(id ? `[Resumen] enviado a Telegram (message_id=${id})` : "[Resumen] NO enviado");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[Resumen] error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
