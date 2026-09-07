/**
 * Telegram helpers for FOREX professional module.
 */

import "server-only";

import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import type { ForexStrategySignal } from "@/lib/investment/forex/strategies/engine";
import type { ForexBacktestStats } from "@/lib/investment/forex/backtest";

export async function notifyForexSignal(params: {
  signal: ForexStrategySignal;
  backtest?: ForexBacktestStats;
  units?: number;
  requireConfirm?: boolean;
  approvalId?: string;
}): Promise<number | null> {
  const s = params.signal;
  const digits = s.pairId.includes("JPY") ? 3 : 5;
  const timeoutMin = Math.max(1, Number(process.env.APPROVAL_TIMEOUT_MINUTES ?? 5) || 5);
  const aid = params.approvalId?.trim() || "";
  const dirEmoji = s.side === "BUY" ? "📈" : "📉";

  const lines = [
    `💱 <b>FOREX SEÑAL — ForgeOS</b>`,
    `${dirEmoji} <b>${s.side} ${s.display}</b> (${s.pairId})`,
    `📋 Estrategia ${s.code}: ${s.name} (${s.timeframe})`,
    `💰 Entry ${s.entry.toFixed(digits)}`,
    `🛑 SL ${s.stopLoss.toFixed(digits)} (${s.stopPips}p)`,
    `🎯 TP ${s.takeProfit.toFixed(digits)} (${s.tpPips}p)`,
    `🔮 Conf ${(s.confidence * 100).toFixed(0)}% · ETA ~${s.estimatedMinutes}m`,
    params.backtest ? `BT ${params.backtest.badge}` : "",
    params.units ? `📦 Size ${params.units.toLocaleString()} units` : "",
    aid ? `🆔 <code>${aid}</code>` : "",
    "",
    aid
      ? `⏱ Tienes ${timeoutMin} min para responder`
      : params.requireConfirm
        ? "⚠️ Confirma en Telegram antes de ejecutar"
        : "",
  ];

  const buttons = aid
    ? [
        [
          { text: "✅ APROBAR", callback_data: `approve:${aid}` },
          { text: "❌ RECHAZAR", callback_data: `reject:${aid}` },
        ],
      ]
    : undefined;

  return sendTelegramMessage(lines.filter(Boolean).join("\n"), buttons);
}

export async function notifyForexOrderFilled(params: {
  pairId: string;
  side: string;
  price: number;
  orderId?: number | string;
  staged: boolean;
}): Promise<number | null> {
  return sendTelegramMessage(
    [
      `✅ FOREX ${params.staged ? "STAGED" : "EJECUTADA"} ${params.side} ${params.pairId}`,
      `Precio ${params.price}`,
      params.orderId != null ? `IBKR #${params.orderId}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function notifyForexDailyGoal(kind: "scalp" | "intraday" | "stop"): Promise<number | null> {
  if (kind === "stop") {
    return sendTelegramMessage("🛑 FOREX STOP DIARIO activado — no más operaciones hoy");
  }
  if (kind === "scalp") {
    return sendTelegramMessage("🎉 FOREX objetivo SCALPING +20 pips alcanzado");
  }
  return sendTelegramMessage("🎉 FOREX objetivo INTRADÍA +50 pips alcanzado");
}
