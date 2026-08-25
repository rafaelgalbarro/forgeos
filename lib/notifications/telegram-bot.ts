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
  orderValueUSD?: number;
  shares?: number;
  reasoning?: string;
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
  options?: { plain?: boolean },
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

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    reply_markup,
  };
  if (!options?.plain) body.parse_mode = "HTML";

  const result = await telegramRequest<{ message_id?: number }>("sendMessage", body);
  if (result?.message_id) {
    console.log(`[Telegram] sendMessage OK message_id=${result.message_id}`);
  } else {
    console.warn("[Telegram] sendMessage falló — sin message_id en respuesta");
  }
  return result?.message_id ?? null;
}

/** Sends a document (PDF, etc.) via Telegram sendDocument (multipart). */
export async function sendTelegramDocument(params: {
  buffer: Buffer;
  filename: string;
  caption?: string;
  mimeType?: string;
}): Promise<number | null> {
  const { chatId, enabled, token } = cfg();
  if (!enabled || !token || !chatId) {
    console.warn("[Telegram] sendDocument omitido — bot no configurado");
    return null;
  }

  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    if (params.caption) {
      form.append("caption", params.caption.slice(0, 1024));
      form.append("parse_mode", "HTML");
    }
    const blob = new Blob([new Uint8Array(params.buffer)], {
      type: params.mimeType ?? "application/pdf",
    });
    form.append("document", blob, params.filename);

    console.log(
      `[Telegram] sendDocument intento chatId=${chatId} file=${params.filename} bytes=${params.buffer.length}`,
    );

    const res = await fetch(apiUrl("sendDocument"), {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Telegram] sendDocument HTTP ${res.status}: ${err}`);
      return null;
    }
    const data = (await res.json()) as { ok?: boolean; result?: { message_id?: number } };
    const messageId = data.result?.message_id ?? null;
    if (messageId != null) {
      console.log(`[Telegram] sendDocument OK message_id=${messageId}`);
    } else {
      console.warn("[Telegram] sendDocument falló — sin message_id");
    }
    return messageId;
  } catch (err) {
    console.warn("[Telegram] sendDocument failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Signal alert — silencio absoluto (solo resumen horario/diario). */
export async function sendSignalAlert(payload: SignalTelegramPayload): Promise<void> {
  console.log(
    `[Telegram] sendSignalAlert omitido (política silencio): ${payload.ticker} ${payload.direction}`,
  );
}

/** Alert / watchlist — silencio absoluto. */
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
  console.log(
    `[Telegram] notifyAlertTriggered omitido (política silencio): ${payload.ticker} — ${payload.reason}`,
  );
}

/** Signal detected — silencio absoluto (solo resumen horario). */
export async function notifySignalDetected(payload: SignalTelegramPayload): Promise<void> {
  console.log(
    `[Telegram] notifySignalDetected omitido (política silencio): ${payload.ticker} ${payload.direction}`,
  );
}

/** Circuit breaker — solo alerta crítica si pérdida ≥10% NAV. */
export async function notifyCircuitBreaker(dailyLossPct: number): Promise<void> {
  if (!(dailyLossPct >= 10)) {
    console.log(
      `[Telegram] risk gate omitido (pérdida ${dailyLossPct.toFixed(1)}% < 10% NAV)`,
    );
    return;
  }
  if (!notifyEnabled("halt")) return;
  const { sendCriticalTelegramAlert } = await import("@/lib/notifications/telegram-policy");
  const text = `🚨 RISK GATE ACTIVADO: Pérdida -${dailyLossPct.toFixed(1)}% NAV. Trading pausado.`;
  await sendCriticalTelegramAlert(text);
}

/** Pre-trade checklist HOLD — uses signal notify flag (same channel as trade alerts). */
export async function notifyPreTradeHold(params: {
  ticker: string;
  reason: string;
  htmlBody?: string;
}): Promise<void> {
  // Noise — do not spam Telegram (hourly digest covers activity)
  console.log(`[Telegram] notifyPreTradeHold omitido (no spam): ${params.ticker}`);
  void params;
}

/** BUY filled — solo bucket horario (sin alerta inmediata). */
export async function notifyOrderExecuted(params: {
  ticker: string;
  shares: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  ibkrOrderId?: string;
}): Promise<void> {
  const ibkrId = String(params.ibkrOrderId ?? "").trim();
  if (!ibkrId || ibkrId.toLowerCase() === "n/a" || ibkrId.toUpperCase().startsWith("PAPER_")) {
    console.log(`[Telegram] notifyOrderExecuted omitido (sin ibkrId): ${params.ticker}`);
    return;
  }
  // Silencio absoluto: solo resumen horario con trades Filled
  const { recordHourlyExecution } = await import("@/lib/notifications/telegram-policy");
  recordHourlyExecution({
    ticker: params.ticker,
    side: "BUY",
    shares: params.shares,
    price: params.price,
  });
  console.log(
    `[Telegram] BUY Filled → bucket horario (sin alerta): ${params.ticker} ibkrId=${ibkrId}`,
  );
  void params.stopLoss;
  void params.takeProfit;
}

/** TP/SL filled — solo bucket horario (sin alerta inmediata). */
export async function notifyPositionClosed(params: {
  kind: "TP" | "SL";
  ticker: string;
  pnlUSD: number;
  pnlPct: number;
  navUSD: number;
  exitPrice?: number;
  shares?: number;
  inherited?: boolean;
}): Promise<void> {
  const { recordHourlyClose } = await import("@/lib/notifications/telegram-policy");
  const price =
    params.exitPrice ??
    (params.shares && params.shares > 0 && params.pnlUSD !== 0
      ? Math.max(0.0001, params.pnlUSD / params.shares)
      : 0);
  recordHourlyClose({
    ticker: params.ticker,
    pnlUSD: params.pnlUSD,
    pnlPct: params.pnlPct,
    price: params.exitPrice ?? price,
    kind: params.kind,
  });
  console.log(
    `[Telegram] ${params.kind} Filled → bucket horario (sin alerta): ${params.ticker}`,
  );
  void params.navUSD;
  void params.inherited;
}

/** Stale position (>24h). */
export async function notifyStalePosition(ticker: string, hoursOpen: number): Promise<void> {
  // Noise — skip Telegram
  console.log(`[Telegram] stale omitido: ${ticker} ${hoursOpen.toFixed(0)}h`);
}

/** Phase G — Portfolio optimizer DEFENSIVE — log only (no Telegram spam). */
export async function notifyPortfolioDefensiveMode(params: {
  maxPositionPct: number;
  spyChangePct: number | null;
  vix: number | null;
  reasons: string[];
  recommendations: string[];
}): Promise<void> {
  console.log(
    `[Telegram] portfolio defensive omitido (no spam): maxPos=${(params.maxPositionPct * 100).toFixed(1)}% ` +
      `spy=${params.spyChangePct ?? "n/a"} vix=${params.vix ?? "n/a"}`,
  );
}

/** Scanner session briefing — log only (no Telegram spam). */
export async function notifyScannerBriefing(params: {
  title: string;
  lines: string[];
}): Promise<void> {
  console.log(
    `[Telegram] scanner briefing omitido (no spam): ${params.title} (${params.lines.length} líneas)`,
  );
}

/** Poll updates (long polling) — used by background poller. */
export async function getTelegramUpdates(offset?: number): Promise<
  Array<{
    update_id: number;
    message?: { text?: string; chat?: { id?: number } };
    callback_query?: {
      id?: string;
      data?: string;
      from?: { id?: number };
      message?: { chat?: { id?: number } };
    };
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
    const data = (await res.json()) as {
      result?: Array<{
        update_id: number;
        message?: { text?: string; chat?: { id?: number } };
        callback_query?: {
          id?: string;
          data?: string;
          from?: { id?: number };
          message?: { chat?: { id?: number } };
        };
      }>;
    };
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
