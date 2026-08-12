import "server-only";

import { getTelegramUpdates, isTelegramConfigured } from "@/lib/notifications/telegram-bot";
import {
  handleTelegramCallback,
  handleTelegramCommand,
} from "@/lib/notifications/telegram-handler";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let offset = 0;
let polling = false;

async function pollOnce(): Promise<void> {
  if (polling || !isTelegramConfigured()) return;
  polling = true;
  try {
    const updates = await getTelegramUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message?.text) {
        await handleTelegramCommand(update.message.text);
      }
      if (update.callback_query?.data && update.callback_query.id) {
        await handleTelegramCallback(update.callback_query.data, update.callback_query.id);
      }
    }
  } catch (err) {
    console.warn("[TelegramPoll]", err instanceof Error ? err.message : err);
  } finally {
    polling = false;
  }
}

/** Long-poll Telegram getUpdates every 30s. Idempotent. */
export function startTelegramPolling(): void {
  if (pollTimer || !isTelegramConfigured()) return;
  console.log("[TelegramPoll] ▶ Polling activo");
  void pollOnce();
  pollTimer = setInterval(() => void pollOnce(), 30_000);
}

export function stopTelegramPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
