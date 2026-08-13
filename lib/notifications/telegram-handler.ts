import "server-only";

import {
  answerCallbackQuery,
  sendTelegramMessage,
} from "@/lib/notifications/telegram-bot";
import { publishInvestmentEvent } from "@/lib/notifications/investment-events";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { OrderApprovalGate } from "@/src/core/trading/order-approval";
import { RiskManager } from "@/src/core/trading/risk/risk-manager";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import {
  disableAlertById,
  queueTickerForCycle,
  removeWatchlistTicker,
} from "@/lib/alerts/alert-manager";
import {
  loadTradingState,
  updateTradingState,
  type RecentSignalRecord,
} from "@/src/core/trading/trading-state-store";

type TradingEngineInstance = import("@/src/core/trading/trading-engine").TradingEngine;
let enginePromise: Promise<TradingEngineInstance> | null = null;

/** Lazy load to avoid circular import with trading-engine.ts */
async function getTradingEngine(): Promise<TradingEngineInstance> {
  if (!enginePromise) {
    enginePromise = import("@/src/core/trading/trading-engine").then(
      ({ TradingEngine }) => new TradingEngine(),
    );
  }
  return enginePromise;
}

function helpText(): string {
  return [
    "<b>ForgeOS Investment Bot</b>",
    "/status — estado sistema y NAV",
    "/portfolio — posiciones con P&L",
    "/pause — pausa trading automático",
    "/resume — reanuda trading",
    "/cycle — ejecuta ciclo manual",
    "/signals — últimas señales",
    "/help — lista comandos",
  ].join("\n");
}

async function portfolioText(): Promise<string> {
  try {
    const positions = await ibkrServiceFetch<
      Array<{ symbol?: string; position?: number; avgCost?: number; unrealizedPnl?: number }>
    >("/api/ibkr/positions");
    if (!positions.length) return "📊 Sin posiciones abiertas";
    return positions
      .filter((p) => Math.abs(Number(p.position ?? 0)) > 0)
      .map((p) => {
        const sym = p.symbol ?? "?";
        const sh = Number(p.position ?? 0);
        const pnl = Number(p.unrealizedPnl ?? 0);
        return `${sym}: ${sh} acc · P&L ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`;
      })
      .join("\n");
  } catch {
    return "📊 Portfolio no disponible (IBKR offline)";
  }
}

async function statusText(): Promise<string> {
  const risk = RiskManager.getInstance();
  let nav = 0;
  let cash = 0;
  let pnl = 0;
  try {
    const acct = await fetchTradingAccountSnapshot();
    nav = acct.navUSD;
    cash = acct.cashUSD;
    pnl = acct.dailyPnlUSD;
  } catch {
    /* ignore */
  }
  const state = loadTradingState();
  return [
    `<b>Estado ForgeOS</b>`,
    risk.isHalted() ? `🛑 DETENIDO: ${risk.getHaltReason()}` : "🟢 Activo",
    state.tradingPaused ? "⏸ Trading automático pausado" : "▶️ Trading automático ON",
    `NAV: $${nav.toFixed(2)} | Cash: $${cash.toFixed(2)}`,
    `P&L día: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
    `Ops hoy: ${risk.getDailyTradeCount()}/${TRADING_CONFIG.ai.maxDailyTrades}`,
    `Pendientes: ${OrderApprovalGate.getInstance().listPending().length}`,
  ].join("\n");
}

function signalsText(): string {
  const signals = loadTradingState().recentSignals.slice(0, 8);
  if (!signals.length) return "Sin señales recientes";
  return signals
    .map(
      (s) =>
        `${s.ticker} ${s.direction} ${(s.confidence * 100).toFixed(0)}% — ${new Date(s.at).toLocaleTimeString("es-ES")}`,
    )
    .join("\n");
}

export async function handleTelegramCommand(text: string): Promise<void> {
  const cmd = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

  switch (cmd) {
    case "/help":
      await sendTelegramMessage(helpText());
      break;
    case "/status":
      await sendTelegramMessage(await statusText());
      break;
    case "/portfolio":
      await sendTelegramMessage(await portfolioText());
      break;
    case "/pause":
      updateTradingState((s) => ({ ...s, tradingPaused: true }));
      await sendTelegramMessage("⏸ Trading automático pausado");
      publishInvestmentEvent({ type: "system_paused", at: new Date().toISOString() });
      break;
    case "/resume":
      RiskManager.getInstance().resume();
      updateTradingState((s) => ({ ...s, tradingPaused: false }));
      await sendTelegramMessage("▶️ Sistema reanudado");
      publishInvestmentEvent({ type: "system_resumed", at: new Date().toISOString() });
      break;
    case "/cycle":
      await sendTelegramMessage("🚀 Ejecutando ciclo manual…");
      try {
        const engine = await getTradingEngine();
        const tickers = TRADING_CONFIG.allowedTickers.slice(0, 8) as unknown as string[];
        const result = await engine.runCycle(tickers);
        global.__lastTradingCycle = result;
        await sendTelegramMessage(
          `✅ Ciclo ${result.cycleId} — ${result.orders.length} tickers · halted=${result.systemHalted}`,
        );
        publishInvestmentEvent({ type: "cycle_complete", at: new Date().toISOString(), payload: result });
      } catch (err) {
        await sendTelegramMessage(`❌ Ciclo falló: ${err instanceof Error ? err.message : "error"}`);
      }
      break;
    case "/signals":
      await sendTelegramMessage(signalsText());
      break;
    default:
      if (text.startsWith("/")) await sendTelegramMessage("Comando desconocido. /help");
  }
}

export async function handleTelegramCallback(
  data: string,
  callbackQueryId: string,
): Promise<void> {
  await answerCallbackQuery(callbackQueryId, "Procesando…");

  if (data === "resume_trading") {
    RiskManager.getInstance().resume();
    updateTradingState((s) => ({ ...s, tradingPaused: false }));
    await sendTelegramMessage("▶️ Sistema reanudado");
    publishInvestmentEvent({ type: "system_resumed", at: new Date().toISOString() });
    return;
  }

  if (data === "view_portfolio" || data === "report_portfolio") {
    await sendTelegramMessage(await portfolioText());
    return;
  }

  if (data === "report_dashboard") {
    const base = (process.env.FORGEOS_PUBLIC_URL?.trim() || "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    await sendTelegramMessage(
      [
        "📊 <b>Dashboard ForgeOS</b>",
        await statusText(),
        "",
        `🔗 ${base}/investment`,
        `📈 Portfolio: ${base}/investment/portfolio`,
      ].join("\n"),
    );
    return;
  }

  const colonIdx = data.indexOf(":");
  const action = colonIdx >= 0 ? data.slice(0, colonIdx) : data;
  const payload = colonIdx >= 0 ? data.slice(colonIdx + 1) : "";

  if (action === "alert_analyze" || action === "watch_analyze") {
    await sendTelegramMessage(
      `📊 Análisis <b>${payload}</b> — abre Markets en el dashboard:\n/investment/markets?t=${payload}`,
    );
    return;
  }

  if (action === "alert_trade" || action === "watch_trade") {
    queueTickerForCycle(payload);
    try {
      const engine = await getTradingEngine();
      const result = await engine.runCycle([payload]);
      await sendTelegramMessage(
        `➕ Ciclo ejecutado para <b>${payload}</b> — ${result.orders.length} resultado(s)`,
      );
    } catch (err) {
      await sendTelegramMessage(
        `➕ ${payload} en cola de ciclo. Error al ejecutar: ${err instanceof Error ? err.message : "error"}`,
      );
    }
    return;
  }

  if (action === "alert_disable" || action === "watch_disable") {
    if (payload.startsWith("watch_")) {
      const ticker = payload.replace(/^watch_/, "").toUpperCase();
      removeWatchlistTicker(ticker);
      await sendTelegramMessage(`🔕 Watchlist ${ticker} quitada`);
    } else {
      disableAlertById(payload);
      await sendTelegramMessage(`🔕 Alerta desactivada: ${payload}`);
    }
    return;
  }

  const approvalId = payload;
  if (!approvalId || approvalId === "none") {
    await sendTelegramMessage("⚠️ Señal sin approvalId — usa el dashboard");
    return;
  }

  try {
    const engine = await getTradingEngine();
    if (action === "approve") {
      const result = await engine.approveAndExecute(approvalId);
      await sendTelegramMessage(`✅ Aprobada y ejecutada: ${result.ticker} ${result.direction}`);
      publishInvestmentEvent({
        type: "order_executed",
        at: new Date().toISOString(),
        payload: result,
      });
    } else if (action === "reject") {
      await engine.rejectPending(approvalId);
      await sendTelegramMessage(`❌ Orden ${approvalId} rechazada`);
    } else if (action === "wait") {
      updateTradingState((state) => ({
        ...state,
        pendingOrders: state.pendingOrders.map((o) =>
          o.approvalId === approvalId
            ? {
                ...o,
                waitUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : o,
        ),
      }));
      await sendTelegramMessage("⏸ Esperando 10 minutos antes de decidir");
    }
  } catch (err) {
    await sendTelegramMessage(`❌ Error: ${err instanceof Error ? err.message : "unknown"}`);
  }
}

export function recordSignalForTelegram(record: RecentSignalRecord): void {
  updateTradingState((state) => ({
    ...state,
    recentSignals: [record, ...state.recentSignals].slice(0, 50),
  }));
}
