/**
 * ForgeOS RiskManager
 * Circuit breaker y sizing de posiciones. Esta capa NUNCA se puede bypassear.
 * State persists to `.forgeos-trading-state.json`.
 */

import { TRADING_CONFIG } from '../trading.config'
import { loadTradingState, updateTradingState } from '../trading-state-store'
import { getMarketSessionForExchange, getMarketSessionInfo, getUsMarketSession } from '../market-session'
import { US_QUOTE_EXCHANGES } from '@/lib/trading/ticker-price-routes'
import {
  DEFENSIVE_TICKERS,
  getPersistedSizingCaps,
  type PortfolioPolicyResult,
} from '../portfolio-optimizer'
import {
  computeDynamicSizing,
  dynamicStopTakeProfit,
  ensureDailySizingRebalance,
} from '../dynamic-sizing'
import { isTickerAllowedForTrading } from '@/lib/investment/cycle-universe'

export type RiskCheckResult =
  | { allowed: true; maxOrderValueUSD: number; stopLossPrice: number; takeProfitPrice: number }
  | { allowed: false; reason: string }

export interface AccountSnapshot {
  navUSD: number
  cashUSD: number
  dailyPnlUSD: number
  openPositionsCount: number
}

export interface PriceData {
  ticker: string
  currentPrice: number
  bid: number
  ask: number
  quoteExchange?: string
  volume?: number
  usExtendedHours?: boolean
}

/** Optional Phase G optimizer overrides (from evaluatePortfolioPolicy). */
export type RiskOptimizerOverrides = {
  maxPositionPct?: number
  allowNewTrade?: boolean
  denyReason?: string
  mode?: PortfolioPolicyResult['mode']
}

export class RiskManager {
  private static instance: RiskManager
  private halted = false
  private haltReason = ''
  private dailyTradeCount = 0
  private lastResetDate = new Date().toDateString()
  private hydrated = false

  static getInstance(): RiskManager {
    if (!RiskManager.instance) RiskManager.instance = new RiskManager()
    return RiskManager.instance
  }

  private ensureHydrated() {
    if (this.hydrated) return
    const { risk } = loadTradingState()
    this.halted = risk.halted
    this.haltReason = risk.haltReason
    this.dailyTradeCount = risk.dailyTradeCount
    this.lastResetDate = risk.lastResetDate
    this.hydrated = true
  }

  private persist() {
    this.ensureHydrated()
    updateTradingState((state) => ({
      ...state,
      risk: {
        ...state.risk,
        halted: this.halted,
        haltReason: this.haltReason,
        dailyTradeCount: this.dailyTradeCount,
        lastResetDate: this.lastResetDate,
      },
    }))
  }

  /** Llamar antes de cualquier orden. Retorna allow/deny con motivo. */
  checkOrder(
    account: AccountSnapshot,
    price: PriceData,
    direction: 'BUY' | 'SELL',
    optimizer?: RiskOptimizerOverrides,
    confidence?: number,
  ): RiskCheckResult {
    this.resetDailyCounterIfNeeded()
    ensureDailySizingRebalance({ cashUSD: account.cashUSD, navUSD: account.navUSD })
    const sizing = computeDynamicSizing({
      cashUSD: account.cashUSD,
      navUSD: account.navUSD,
      confidence,
    })

    // 1. Circuit breaker global
    if (this.halted) {
      return { allowed: false, reason: `Sistema detenido: ${this.haltReason}` }
    }

    // 1b. Phase G — portfolio optimizer gate (fresh policy and/or persisted caps)
    const persisted = getPersistedSizingCaps()
    if (optimizer?.allowNewTrade === false) {
      return {
        allowed: false,
        reason: optimizer.denyReason ?? 'Portfolio optimizer blocked new trade',
      }
    }
    // Persisted defensive universe when no fresh policy was passed into this check
    if (
      !optimizer &&
      direction === 'BUY' &&
      persisted.enabled &&
      persisted.defensiveUniverseOnly &&
      !(DEFENSIVE_TICKERS as readonly string[]).includes(price.ticker.toUpperCase())
    ) {
      return {
        allowed: false,
        reason: `Modo DEFENSIVE (VIX): ${price.ticker} no está en ${DEFENSIVE_TICKERS.join('/')}`,
      }
    }

    // 2. Límite de pérdida diaria
    const dailyLossLimit = account.navUSD * TRADING_CONFIG.risk.dailyLossLimitPct
    if (account.dailyPnlUSD <= -dailyLossLimit) {
      this.halt(`Pérdida diaria de ${Math.abs(account.dailyPnlUSD).toFixed(2)}$ supera límite de ${dailyLossLimit.toFixed(2)}$`)
      return { allowed: false, reason: this.haltReason }
    }

    // 3. Ticker permitido: allowlist estática o candidatos del scanner del día
    if (!isTickerAllowedForTrading(price.ticker)) {
      return { allowed: false, reason: `${price.ticker} no está en allowlist ni en el scanner del día` }
    }

    // 4. Máximo de posiciones abiertas (solo en compras) — dinámico floor(cash/50)
    if (direction === 'BUY' && account.openPositionsCount >= sizing.maxOpenPositions) {
      return {
        allowed: false,
        reason: `Límite de ${sizing.maxOpenPositions} posiciones abiertas alcanzado (cash $${account.cashUSD.toFixed(0)})`,
      }
    }

    if (direction === 'BUY' && sizing.analysisOnly) {
      return {
        allowed: false,
        reason: 'Modo solo análisis — cash < $30 (reserva de liquidez)',
      }
    }

    if (direction === 'BUY' && !sizing.canTradeStocks) {
      return {
        allowed: false,
        reason: `Cash insuficiente para operar (mín $${TRADING_CONFIG.risk.dynamicSizing.minCashToTradeUSD}, actual $${account.cashUSD.toFixed(2)})`,
      }
    }

    // 4b. Horario de mercado por exchange internacional (según ruta de cotización usada)
    const quoteExchange = price.quoteExchange ?? 'SMART'
    const isUsQuote = US_QUOTE_EXCHANGES.has(quoteExchange.toUpperCase())
    if (isUsQuote) {
      const usSession = getUsMarketSession()
      if (!usSession.isTradeable) {
        return {
          allowed: false,
          reason: `${price.ticker} fuera de horario USA (${usSession.sessionLabel})`,
        }
      }
      if (price.usExtendedHours) {
        const minVol = TRADING_CONFIG.schedule.extendedHoursMinVolume
        const vol = price.volume ?? 0
        if (vol < minVol) {
          return {
            allowed: false,
            reason: `Volumen ${vol.toLocaleString()} < mínimo ${minVol.toLocaleString()} en premarket/aftermarket`,
          }
        }
      }
    } else {
      const marketSession = getMarketSessionForExchange(quoteExchange, price.ticker) ?? getMarketSessionInfo(price.ticker)
      if (marketSession && !marketSession.isOpenNow) {
        return {
          allowed: false,
          reason: `${price.ticker} (${marketSession.exchange}) fuera de horario local ${marketSession.sessionLabel} ${marketSession.timeZone}`,
        }
      }
    }

    // 5. Cash suficiente — dynamic sizing + optional Kelly / defensive caps
    const optimizerPct =
      optimizer?.maxPositionPct != null
        ? optimizer.maxPositionPct
        : persisted.enabled
          ? persisted.maxPositionPct
          : TRADING_CONFIG.risk.maxPositionPct
    let maxOrderValue = Math.min(
      sizing.maxOrderValueUSD,
      account.navUSD * Math.max(0, optimizerPct),
      sizing.deployableCashUSD,
    )
    if (price.usExtendedHours) {
      maxOrderValue *= TRADING_CONFIG.schedule.extendedHoursMaxOrderSizeFactor
    }
    if (direction === 'BUY' && sizing.deployableCashUSD < TRADING_CONFIG.risk.dynamicSizing.minOrderUSD) {
      return {
        allowed: false,
        reason: `Cash desplegable insuficiente: $${sizing.deployableCashUSD.toFixed(2)} (70% de $${account.cashUSD.toFixed(2)})`,
      }
    }

    // 6. Máximo de operaciones diarias
    if (this.dailyTradeCount >= TRADING_CONFIG.ai.maxDailyTrades) {
      return { allowed: false, reason: `Límite diario de ${TRADING_CONFIG.ai.maxDailyTrades} operaciones alcanzado` }
    }

    // 7. Precio razonable (evitar gaps extremos bid/ask)
    const spread = (price.ask - price.bid) / price.currentPrice
    if (spread > 0.05) {
      return { allowed: false, reason: `Spread bid/ask demasiado alto: ${(spread * 100).toFixed(2)}%` }
    }

    // ✅ Todo OK — calcular parámetros de la orden (SL 2%, TP 1:2)
    const { stopLoss: stopLossPrice, takeProfit: takeProfitPrice } = dynamicStopTakeProfit(
      price.currentPrice,
      direction,
      sizing,
    )

    return {
      allowed: true,
      maxOrderValueUSD: Math.min(maxOrderValue, sizing.deployableCashUSD),
      stopLossPrice,
      takeProfitPrice,
    }
  }

  recordTrade() {
    this.resetDailyCounterIfNeeded()
    this.dailyTradeCount++
    this.persist()
  }

  halt(reason: string) {
    this.ensureHydrated()
    this.halted = true
    this.haltReason = reason
    this.persist()
    console.error(`[RiskManager] 🛑 SISTEMA DETENIDO: ${reason}`)

    void (async () => {
      const { publishInvestmentEvent } = await import('@/lib/notifications/investment-events')
      const { notifyCircuitBreaker } = await import('@/lib/notifications/telegram-bot')
      publishInvestmentEvent({
        type: 'circuit_breaker',
        at: new Date().toISOString(),
        payload: { reason },
      })
      await notifyCircuitBreaker(10)
    })()
  }

  resume() {
    this.ensureHydrated()
    this.halted = false
    this.haltReason = ''
    this.persist()
    console.log('[RiskManager] ✅ Sistema reanudado manualmente')
  }

  isHalted() {
    this.ensureHydrated()
    return this.halted
  }

  getHaltReason() {
    this.ensureHydrated()
    return this.haltReason
  }

  getDailyTradeCount() {
    this.ensureHydrated()
    return this.dailyTradeCount
  }

  private resetDailyCounterIfNeeded() {
    this.ensureHydrated()
    const today = new Date().toDateString()
    if (this.lastResetDate !== today) {
      this.dailyTradeCount = 0
      this.lastResetDate = today
      this.persist()
      // No auto-resume halt — requiere intervención manual
    }
  }
}
