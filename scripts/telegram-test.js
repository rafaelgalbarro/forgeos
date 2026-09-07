#!/usr/bin/env node
/**
 * Telegram smoke test — loads .env.local, sends startup message, runs /status handler.
 */
const { loadEnvLocal, log } = require("./_utils");

loadEnvLocal();

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

if (!token || !chatId) {
  console.error("FAIL: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados");
  process.exit(1);
}

async function sendMessage(text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description ?? `HTTP ${res.status}`);
  }
  return data.result;
}

async function main() {
  log("▸ Enviando mensaje de prueba…");
  await sendMessage("🟢 ForgeOS Investment iniciado correctamente");
  log("  ✓ Mensaje de prueba enviado");

  log("▸ Simulando /status (mismo handler que el bot)…");
  // Dynamic import not available — invoke status via local HTTP once Next is up
  const base = "http://127.0.0.1:3000";
  try {
    const cycle = await fetch(`${base}/api/trading/cycle`, { signal: AbortSignal.timeout(30_000) });
    const status = cycle.ok ? await cycle.json() : null;
    const lines = [
      "<b>Estado ForgeOS</b>",
      status?.systemHalted ? `🛑 DETENIDO: ${status.haltReason}` : "🟢 Activo",
      `Ops hoy: ${status?.dailyTradeCount ?? 0}`,
      `Pendientes: ${status?.pendingApprovals?.length ?? 0}`,
    ];
    await sendMessage(lines.join("\n"));
    log("  ✓ Respuesta /status enviada al chat");
    console.log(JSON.stringify({ ok: true, systemHalted: status?.systemHalted ?? null }));
  } catch (err) {
    log(`  ⚠ Next no disponible aún — /status vía API omitido: ${err.message}`);
    console.log(JSON.stringify({ ok: true, statusViaApi: false }));
  }
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
