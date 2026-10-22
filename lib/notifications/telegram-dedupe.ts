/**
 * Anti-spam for Telegram: the same message (ignoring numbers) is sent at most once per
 * window. Trade executions / closes / critical alerts always pass.
 * Pure module (no server-only) so it can be unit-tested.
 */

export const TELEGRAM_DEDUPE_WINDOW_MS = 60 * 60_000;

const ALWAYS_SEND =
  /(EXECUTED|ejecutad|Filled|compra|venta|cerrad|cierre|STOP LOSS|TAKE PROFIT|\bTP\b|\bSL\b|FRENO|CRÍTIC|CRITIC|🛑|🚨|LONG Futures|SHORT Futures|liquidaci)/i;

export function telegramPreview(text: string, max = 90): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function telegramDedupeKey(text: string): string {
  return telegramPreview(text, 400)
    .toLowerCase()
    .replace(/[0-9]+([.,][0-9]+)?/g, "#")
    .replace(/\s+/g, " ");
}

export function isAlwaysSendTelegram(text: string): boolean {
  return ALWAYS_SEND.test(telegramPreview(text, 400));
}

const lastSentAt = new Map<string, number>();

/** true → skip (duplicate inside the window). Records the send otherwise. */
export function shouldSkipDuplicateTelegram(
  text: string,
  now: number = Date.now(),
  windowMs: number = TELEGRAM_DEDUPE_WINDOW_MS,
): boolean {
  if (isAlwaysSendTelegram(text)) return false;
  const key = telegramDedupeKey(text);
  const prev = lastSentAt.get(key);
  if (prev != null && now - prev < windowMs) return true;
  lastSentAt.set(key, now);
  if (lastSentAt.size > 500) {
    for (const [k, t] of lastSentAt) if (now - t > windowMs) lastSentAt.delete(k);
  }
  return false;
}

export function __resetTelegramDedupeForTests(): void {
  lastSentAt.clear();
}
