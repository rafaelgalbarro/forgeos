import "server-only";

import { getTelegramUpdates, isTelegramConfigured } from "@/lib/notifications/telegram-bot";
import {
  handleTelegramCallback,
  handleTelegramCommand,
} from "@/lib/notifications/telegram-handler";

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let offset = 0;
let polling = false;
let stopped = false;

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
        const chatId =
          update.callback_query.message?.chat?.id ??
          update.callback_query.from?.id ??
          update.message?.chat?.id;
        await handleTelegramCallback(
          update.callback_query.data,
          update.callback_query.id,
          chatId,
        );
      }
    }
  } catch (err) {
    console.warn("[TelegramPoll]", err instanceof Error ? err.message : err);
  } finally {
    polling = false;
  }
}

async function pollLoop(): Promise<void> {
  if (stopped || !isTelegramConfigured()) return;
  await pollOnce();
  pollTimer = setTimeout(() => void pollLoop(), 400);
}

/** Long-poll Telegram getUpdates (webhook or this loop). Idempotent. */
export function startTelegramPolling(): void {
  if (pollTimer || !isTelegramConfigured()) return;
  stopped = false;
  console.log("[TelegramPoll] ▶ Polling activo");
  void pollLoop();
}

export function stopTelegramPolling(): void {
  stopped = true;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}
