import "server-only";

import {
  answerCallbackQuery,
  sendTelegramMessage,
} from "@/lib/notifications/telegram-bot";
import { publishInvestmentEvent } from "@/lib/notifications/investment-events";

/** Replies to the owner's own Telegram commands always pass the "trades only" filter. */
function reply(text: string, buttons?: Parameters<typeof sendTelegramMessage>[1]): Promise<number | null> {
  return sendTelegramMessage(text, buttons, { kind: "reply" });
}
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { OrderApprovalGate } from "@/src/core/trading/order-approval";
import { RiskManager } from "@/src/core/trading/risk/risk-manager";
import {
  isFounderTelegramChat,
  processOrderApproval,
} from "@/lib/investment/order-approval-service";
import {
  disableAlertById,
  queueTickerForCycle,
  removeWatchlistTicker,
} from "@/lib/alerts/alert-manager";
import { getDailyMarketUniverse } from "@/lib/investment/market-daily-universe";
import { sendCyclePremiumReport } from "@/lib/notifications/cycle-premium-report";
import {
  executeCommitteeSales,
  getCommitteeAnalysis,
  runPortfolioCommitteeAnalysis,
} from "@/lib/investment/portfolio-committee";
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
    `Ops hoy: ${risk.getDailyTradeCount()} (sin tope diario — solo capital)`,
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
      await reply(helpText());
      break;
    case "/status":
      await reply(await statusText());
      break;
    case "/portfolio":
      await reply(await portfolioText());
      break;
    case "/pause":
      updateTradingState((s) => ({ ...s, tradingPaused: true }));
      await reply("⏸ Trading automático pausado");
      publishInvestmentEvent({ type: "system_paused", at: new Date().toISOString() });
      break;
    case "/resume":
      RiskManager.getInstance().resume();
      updateTradingState((s) => ({ ...s, tradingPaused: false }));
      await reply("▶️ Sistema reanudado");
      publishInvestmentEvent({ type: "system_resumed", at: new Date().toISOString() });
      break;
    case "/cycle":
      await reply("🚀 Ejecutando ciclo manual…");
      try {
        const engine = await getTradingEngine();
        const { resolveTradingCycleTickersAsync } = await import("@/lib/investment/cycle-universe");
        const universe = await resolveTradingCycleTickersAsync(100);
        const result = await engine.runCycle(universe.tickers);
        global.__lastTradingCycle = result;
        const daily = getDailyMarketUniverse();
        await sendCyclePremiumReport(result, {
          analyzed: universe.tickers.length,
          universeScanned: daily?.screenerCount ?? universe.universeSize,
          universeFiltered: daily?.tickers.length ?? universe.universeSize,
        });
        publishInvestmentEvent({ type: "cycle_complete", at: new Date().toISOString(), payload: result });
      } catch (err) {
        await reply(`❌ Ciclo falló: ${err instanceof Error ? err.message : "error"}`);
      }
      break;
    case "/signals":
      await reply(signalsText());
      break;
    default:
      if (text.startsWith("/")) await reply("Comando desconocido. /help");
  }
}

export async function handleTelegramCallback(
  data: string,
  callbackQueryId: string,
  chatId?: string | number | null,
): Promise<void> {
  if (chatId != null && !isFounderTelegramChat(chatId)) {
    await answerCallbackQuery(callbackQueryId, "Solo founder");
    await reply("⛔ Solo el founder puede aprobar órdenes.");
    return;
  }

  await answerCallbackQuery(callbackQueryId, "Procesando…");

  if (data === "resume_trading") {
    RiskManager.getInstance().resume();
    updateTradingState((s) => ({ ...s, tradingPaused: false }));
    await reply("▶️ Sistema reanudado");
    publishInvestmentEvent({ type: "system_resumed", at: new Date().toISOString() });
    return;
  }

  if (data === "view_portfolio" || data === "report_portfolio") {
    await reply(await portfolioText());
    return;
  }

  if (data === "run_cycle") {
    await handleTelegramCommand("/cycle");
    return;
  }

  if (data === "view_settings") {
    await reply(await statusText());
    return;
  }

  if (data === "view_history") {
    const { loadOptimizerState } = await import("@/src/core/trading/portfolio-optimizer");
    const rows = loadOptimizerState().closedOutcomes.slice(0, 10);
    if (rows.length === 0) {
      await reply("📈 Sin operaciones cerradas recientes.");
      return;
    }
    const lines = rows.map(
      (o) =>
        `${(o.pnlUSD ?? 0) >= 0 ? "🟢" : "🔴"} ${o.ticker} ${o.kind} | P&L ${(o.pnlPct ?? 0).toFixed(1)}% | $${(o.pnlUSD ?? 0).toFixed(2)}`,
    );
    await reply(["📈 <b>HISTÓRICO RECIENTE</b>", ...lines].join("\n"));
    return;
  }

  if (data === "committee_run") {
    await reply("🧠 Ejecutando AI Committee…");
    try {
      await runPortfolioCommitteeAnalysis();
    } catch (err) {
      await reply(
        `❌ Committee failed: ${err instanceof Error ? err.message : "error"}`,
      );
    }
    return;
  }

  if (data === "report_dashboard") {
    const base = (process.env.FORGEOS_PUBLIC_URL?.trim() || "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    await reply(
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
    await reply(
      `📊 Análisis <b>${payload}</b> — abre Markets en el dashboard:\n/investment/markets?t=${payload}`,
    );
    return;
  }

  if (action === "alert_trade" || action === "watch_trade") {
    queueTickerForCycle(payload);
    try {
      const engine = await getTradingEngine();
      const result = await engine.runCycle([payload], { explicitTickers: true });
      await reply(
        `➕ Ciclo ejecutado para <b>${payload}</b> — ${result.orders.length} resultado(s)`,
      );
    } catch (err) {
      await reply(
        `➕ ${payload} en cola de ciclo. Error al ejecutar: ${err instanceof Error ? err.message : "error"}`,
      );
    }
    return;
  }

  if (action === "alert_disable" || action === "watch_disable") {
    if (payload.startsWith("watch_")) {
      const ticker = payload.replace(/^watch_/, "").toUpperCase();
      removeWatchlistTicker(ticker);
      await reply(`🔕 Watchlist ${ticker} quitada`);
    } else {
      disableAlertById(payload);
      await reply(`🔕 Alerta desactivada: ${payload}`);
    }
    return;
  }

  if (action === "committee_view") {
    const analysis = getCommitteeAnalysis(payload);
    if (!analysis) {
      await reply("⚠️ Análisis no encontrado o expirado");
      return;
    }
    const lines = analysis.positions.slice(0, 40).map((p) => {
      return `${p.governor.decision === "VENDER" ? "🔴" : "🟢"} ${p.symbol} | PnL ${p.pnl_pct.toFixed(1)}% | Conf ${(p.governor.confidence * 100).toFixed(0)}% | ${p.governor.reason}`;
    });
    await reply(
      ["📋 <b>ANÁLISIS COMPLETO COMMITTEE</b>", ...lines].join("\n"),
    );
    return;
  }

  if (action === "committee_execute") {
    try {
      const result = await executeCommitteeSales(payload);
      await reply(
        `✅ Vendidas ${result.sold} posiciones | Capital liberado: $${result.capitalFreed.toFixed(2)}`,
      );
    } catch (err) {
      await reply(
        `❌ Committee execute failed: ${err instanceof Error ? err.message : "error"}`,
      );
    }
    return;
  }

  if (action === "committee_cancel") {
    await reply("❌ Comité cancelado por usuario");
    return;
  }

  const approvalId = payload;
  if (!approvalId || approvalId === "none") {
    await reply("⚠️ Señal sin approvalId — usa el dashboard");
    return;
  }

  if (action === "approve" || action === "reject") {
    const result = await processOrderApproval({
      approvalId,
      action,
      chatId,
    });
    if (!result.ok && result.error) {
      await reply(`❌ ${result.error}`);
    }
    return;
  }

  await reply(`⚠️ Acción desconocida: ${action}`);
}

export function recordSignalForTelegram(record: RecentSignalRecord): void {
  updateTradingState((state) => ({
    ...state,
    recentSignals: [record, ...state.recentSignals].slice(0, 50),
  }));
}
