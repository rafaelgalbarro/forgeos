#!/usr/bin/env node
/**
 * ForgeOS — Telegram long-poll sidecar (optional; also runs via Next instrumentation).
 * POSTs updates to local webhook when Next is up.
 */
const http = require("http");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_FILTER = process.env.TELEGRAM_CHAT_ID?.trim();
const WEBHOOK = process.env.FORGEOS_TELEGRAM_WEBHOOK ?? "http://127.0.0.1:3000/api/telegram/webhook";
const NEXT_PORT = 3000;

if (!TOKEN) {
  console.log("[telegram-poll] TELEGRAM_BOT_TOKEN no configurado — skip");
  process.exit(0);
}

let offset = 0;

function postWebhook(body) {
  return new Promise((resolve) => {
    const url = new URL(WEBHOOK);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || NEXT_PORT,
        path: url.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 15_000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", () => resolve(0));
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function poll() {
  const params = new URLSearchParams({ timeout: "25" });
  if (offset) params.set("offset", String(offset));
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?${params}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return;
    const data = await res.json();
    for (const update of data.result ?? []) {
      offset = update.update_id + 1;
      const chatId =
        update.message?.chat?.id?.toString() ??
        update.callback_query?.message?.chat?.id?.toString() ??
        update.callback_query?.from?.id?.toString();
      if (CHAT_FILTER && chatId && chatId !== CHAT_FILTER) continue;
      const payload = update.message
        ? { message: update.message, update_id: update.update_id }
        : { callback_query: update.callback_query, update_id: update.update_id };
      await postWebhook(payload);
    }
  } catch {
    /* retry */
  }
}

console.log("[telegram-poll] ▶ Relay →", WEBHOOK);

async function loop() {
  await poll();
  setTimeout(() => void loop(), 400);
}
void loop();
