import "server-only";

export type TelegramInlineButton = {
  text: string;
  callback_data: string;
};

export type SignalTelegramPayload = {
  ticker: string;
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  newsSentiment?: string;
  rsi?: number | null;
  patternName?: string;
  approvalId?: string;
};

function cfg() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  return { token, chatId, enabled: Boolean(token && chatId) };
}

function apiUrl(method: string): string {
  const { token } = cfg();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no configurado");
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const { enabled } = cfg();
  if (!enabled) {
    console.log(`[Telegram] skip ${method} — token/chat_id no configurados`);
    return null;
  }
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Telegram] ${method} HTTP ${res.status}: ${err}`);
      return null;
    }
    const data = (await res.json()) as { ok?: boolean; result?: T };
    return data.result ?? null;
  } catch (err) {
    console.warn(`[Telegram] ${method} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function pct(from: number, to: number): string {
  if (!from) return "0.0";
  return (((to - from) / from) * 100).toFixed(1);
}

function notifyEnabled(flag: "signal" | "execution" | "halt" | "alert"): boolean {
  const map = {
    signal: process.env.NOTIFY_ON_SIGNAL !== "false",
    execution: process.env.NOTIFY_ON_EXECUTION !== "false",
    halt: process.env.NOTIFY_ON_HALT !== "false",
    alert: process.env.NOTIFY_ON_ALERT !== "false",
  };
  return map[flag];
}

/** Sends a plain text message to the configured chat. */
export async function sendTelegramMessage(
  text: string,
  buttons?: TelegramInlineButton[][],
): Promise<number | null> {
  const { chatId, enabled } = cfg();
  if (!chatId) {
    console.warn("[Telegram] sendMessage omitido — TELEGRAM_CHAT_ID vacío");
    return null;
  }
  if (!enabled) {
    console.warn("[Telegram] sendMessage omitido — bot no configurado");
    return null;
  }

  console.log(`[Telegram] sendMessage intento chatId=${chatId} chars=${text.length} buttons=${buttons?.length ?? 0}`);

  const reply_markup = buttons?.length
    ? { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.callback_data }))) }
    : undefined;

  const result = await telegramRequest<{ message_id?: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup,
  });
  if (result?.message_id) {
    console.log(`[Telegram] sendMessage OK message_id=${result.message_id}`);
  } else {
    console.warn("[Telegram] sendMessage falló — sin message_id en respuesta");
  }
  return result?.message_id ?? null;
}

/** Signal alert — logs every attempt; alias público para el motor de trading. */
export async function sendSignalAlert(payload: SignalTelegramPayload): Promise<void> {
  const { enabled } = cfg();
  const notifyOn = notifyEnabled("signal");
  console.log(
    `[Telegram] sendSignalAlert intento: ${payload.ticker} ${payload.direction} ` +
      `conf=${(payload.confidence * 100).toFixed(0)}% approvalId=${payload.approvalId ?? "none"} ` +
      `bot=${enabled} notifyOnSignal=${notifyOn}`,
  );
  if (!enabled) {
    console.warn("[Telegram] sendSignalAlert omitido — TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID vacíos");
    return;
  }
  if (!notifyOn) {
    console.warn("[Telegram] sendSignalAlert omitido — NOTIFY_ON_SIGNAL=false");
    return;
  }
  await notifySignalDetected(payload);
  console.log(`[Telegram] sendSignalAlert completado: ${payload.ticker}`);
}

/** Alert / watchlist triggered — Telegram con botones de acción. */
export async function notifyAlertTriggered(payload: {
  alertId: string;
  ticker: string;
  label: string;
  reason: string;
  price?: number;
  rsi?: number | null;
  patternName?: string;
  isWatchlist?: boolean;
}): Promise<void> {
  if (!notifyEnabled("alert") && !notifyEnabled("signal")) return;

  console.log(
    `[Telegram] notifyAlertTriggered: ${payload.ticker} — ${payload.reason} alertId=${payload.alertId}`,
  );

  const lines = [
    "🔔 <b>ALERTA ACTIVADA</b>",
    `📈 <b>${payload.ticker}</b> — ${payload.label}`,
    payload.price != null ? `💰 Precio actual: $${payload.price.toFixed(2)}` : "",
    `📊 RSI: ${payload.rsi?.toFixed(0) ?? "N/A"} | Patrón: ${payload.patternName ?? "—"}`,
    payload.reason,
  ].filter(Boolean);

  const prefix = payload.isWatchlist ? "watch" : "alert";
  await sendTelegramMessage(lines.join("\n"), [
    [
      { text: "📊 ANALIZAR", callback_data: `${prefix}_analyze:${payload.ticker}` },
      { text: "➕ OPERAR", callback_data: `${prefix}_trade:${payload.ticker}` },
      { text: "🔕 DESACTIVAR", callback_data: `${prefix}_disable:${payload.alertId}` },
    ],
  ]);
}

/** Signal detected — with approve/reject/wait buttons. */
export async function notifySignalDetected(payload: SignalTelegramPayload): Promise<void> {
  if (!notifyEnabled("signal")) return;

  const slPct = pct(payload.entry, payload.stopLoss);
  const tpPct = pct(payload.entry, payload.takeProfit);
  const dirEmoji = payload.direction === "BUY" ? "📈" : "📉";

  const text = [
    "🚨 <b>SEÑAL — ForgeOS</b>",
    `${dirEmoji} <b>${payload.ticker}</b> — ${payload.direction}`,
    `💰 Entry: $${payload.entry.toFixed(2)}`,
    `🛑 SL: $${payload.stopLoss.toFixed(2)} (${slPct}%)`,
    `🎯 TP: $${payload.takeProfit.toFixed(2)} (${tpPct}%)`,
    `📊 Confianza: ${(payload.confidence * 100).toFixed(0)}%`,
    `📰 Sentimiento noticias: ${payload.newsSentiment ?? "NEUTRAL"}`,
    `📉 RSI: ${payload.rsi?.toFixed(0) ?? "N/A"} | Patrón: ${payload.patternName ?? "—"}`,
  ].join("\n");

  const aid = payload.approvalId ?? "none";
  await sendTelegramMessage(text, [
    [
      { text: "✅ APROBAR", callback_data: `approve:${aid}` },
      { text: "❌ RECHAZAR", callback_data: `reject:${aid}` },
      { text: "⏸ ESPERAR 10min", callback_data: `wait:${aid}` },
    ],
  ]);
}

/** Circuit breaker halted. */
export async function notifyCircuitBreaker(dailyLossPct: number): Promise<void> {
  if (!notifyEnabled("halt")) return;
  const text = `🛑 <b>SISTEMA DETENIDO</b> — Pérdida diaria ${dailyLossPct.toFixed(1)}%`;
  await sendTelegramMessage(text, [
    [
      { text: "▶️ REANUDAR", callback_data: "resume_trading" },
      { text: "📊 VER CARTERA", callback_data: "view_portfolio" },
    ],
  ]);
}

/** Pre-trade checklist HOLD — uses signal notify flag (same channel as trade alerts). */
export async function notifyPreTradeHold(params: {
  ticker: string;
  reason: string;
  htmlBody?: string;
}): Promise<void> {
  if (!notifyEnabled("signal")) return;
  console.log(`[Telegram] notifyPreTradeHold: ${params.ticker} — ${params.reason.slice(0, 120)}`);
  const text =
    params.htmlBody?.trim() ||
    [
      "⏸ <b>PRETRADE HOLD</b> — ForgeOS",
      `📈 <b>${params.ticker}</b>`,
      params.reason,
    ].join("\n");
  await sendTelegramMessage(text);
}

/** Order executed. */
export async function notifyOrderExecuted(params: {
  ticker: string;
  shares: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}): Promise<void> {
  if (!notifyEnabled("execution")) return;
  const text = [
    `✅ <b>EJECUTADA:</b> ${params.ticker} ${params.shares} acc a $${params.price.toFixed(2)}`,
    params.stopLoss != null ? `SL: $${params.stopLoss.toFixed(2)}` : "",
    params.takeProfit != null ? `TP: $${params.takeProfit.toFixed(2)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  await sendTelegramMessage(text);
}

/** Take profit or stop loss hit. */
export async function notifyPositionClosed(params: {
  kind: "TP" | "SL";
  ticker: string;
  pnlUSD: number;
  pnlPct: number;
  navUSD: number;
}): Promise<void> {
  if (!notifyEnabled("execution")) return;
  const icon = params.kind === "TP" ? "🎯 TP ALCANZADO" : "🛑 SL ALCANZADO";
  const sign = params.pnlUSD >= 0 ? "+" : "";
  const text = `${icon}\n${params.ticker} ${sign}$${params.pnlUSD.toFixed(2)} (${sign}${params.pnlPct.toFixed(1)}%) | NAV: $${params.navUSD.toFixed(2)}`;
  await sendTelegramMessage(text);
}

/** Stale position (>24h). */
export async function notifyStalePosition(ticker: string, hoursOpen: number): Promise<void> {
  await sendTelegramMessage(
    `⏰ <b>Posición abierta ${hoursOpen.toFixed(0)}h</b> — ${ticker} sin alcanzar SL/TP`,
  );
}

/** Phase G — Portfolio optimizer entered DEFENSIVE mode (recommendations only). */
export async function notifyPortfolioDefensiveMode(params: {
  maxPositionPct: number;
  spyChangePct: number | null;
  vix: number | null;
  reasons: string[];
  recommendations: string[];
}): Promise<void> {
  if (!notifyEnabled("halt") && !notifyEnabled("signal")) return;
  const lines = [
    "🛡 <b>PORTFOLIO DEFENSIVE</b> — ForgeOS",
    params.spyChangePct != null
      ? `📉 SPY día: ${params.spyChangePct >= 0 ? "+" : ""}${params.spyChangePct.toFixed(2)}%`
      : "📉 SPY día: NO_DATA",
    params.vix != null ? `📊 VIX: ${params.vix.toFixed(1)}` : "📊 VIX: NO_DATA",
    `🔒 Nuevo tamaño máx: ${(params.maxPositionPct * 100).toFixed(2)}% NAV`,
    "",
    "<b>Motivos</b>",
    ...params.reasons.slice(0, 6).map((r) => `• ${r}`),
    "",
    "<b>Plan (recomendación — sin órdenes live no supervisadas)</b>",
    ...params.recommendations.slice(0, 6).map((r) => `• ${r}`),
  ];
  await sendTelegramMessage(lines.join("\n"));
}

/** Poll updates (long polling) — used by background poller. */
export async function getTelegramUpdates(offset?: number): Promise<
  Array<{
    update_id: number;
    message?: { text?: string; chat?: { id?: number } };
    callback_query?: { id?: string; data?: string; message?: { chat?: { id?: number } } };
  }>
> {
  const { enabled } = cfg();
  if (!enabled) return [];
  const params = new URLSearchParams({ timeout: "25" });
  if (offset != null) params.set("offset", String(offset));
  try {
    const res = await fetch(`${apiUrl("getUpdates")}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { result?: Array<{ update_id: number; message?: { text?: string; chat?: { id?: number } }; callback_query?: { id?: string; data?: string; message?: { chat?: { id?: number } } } }> };
    return data.result ?? [];
  } catch {
    return [];
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export function isTelegramConfigured(): boolean {
  return cfg().enabled;
}
