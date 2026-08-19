/**
 * ForgeOS — API Route: /api/trading/cycle
 * Dispara un ciclo de trading completo.
 * En producción, llamar desde un cron job (Vercel Cron / Railway).
 *
 * POST /api/trading/cycle           → ejecuta ciclo con tickers por defecto
 * POST /api/trading/cycle/halt      → detiene el sistema
 * POST /api/trading/cycle/resume    → reanuda el sistema
 */

import { NextRequest, NextResponse } from 'next/server'
import { TradingEngine } from '@/src/core/trading/trading-engine'
import { RiskManager } from '@/src/core/trading/risk/risk-manager'
import { OrderApprovalGate } from '@/src/core/trading/order-approval'
import { TRADING_CONFIG } from '@/src/core/trading/trading.config'
import { computeDynamicSizing } from '@/src/core/trading/dynamic-sizing'
import { fetchTradingAccountSnapshot } from '@/lib/trading/ibkr-data'
import { expireStalePendingApprovals, countPendingApprovals } from '@/lib/investment/order-approval-service'
import { publishInvestmentEvent } from '@/lib/notifications/investment-events'
import { popCycleQueue } from '@/lib/alerts/alert-manager'
import { resolveTradingCycleTickers } from '@/lib/investment/cycle-universe'
import { refreshDailyMarketUniverse, getDailyMarketUniverse } from '@/lib/investment/market-daily-universe'
import { sendCyclePremiumReport } from '@/lib/notifications/cycle-premium-report'

const engine = new TradingEngine()

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // Acciones de control del sistema
  if (action === 'halt') {
    RiskManager.getInstance().halt('Detenido manualmente por el usuario')
    return NextResponse.json({ halted: true, reason: 'Manual halt' })
  }

  if (action === 'resume') {
    RiskManager.getInstance().resume()
    return NextResponse.json({ halted: false })
  }

  if (action === 'approve') {
    try {
      const body = await req.json().catch(() => ({}))
      const approvalId = body.approvalId as string | undefined
      if (!approvalId) {
        return NextResponse.json({ error: 'approvalId required' }, { status: 400 })
      }
      const result = await engine.approveAndExecute(approvalId)
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Approve failed' },
        { status: 400 },
      )
    }
  }

  if (action === 'reject') {
    try {
      const body = await req.json().catch(() => ({}))
      const approvalId = body.approvalId as string | undefined
      if (!approvalId) {
        return NextResponse.json({ error: 'approvalId required' }, { status: 400 })
      }
      const result = await engine.rejectPending(approvalId)
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Reject failed' },
        { status: 400 },
      )
    }
  }

  // Ciclo de trading — queues PENDING_APPROVAL; does not auto-execute
  try {
    await expireStalePendingApprovals()
    await refreshDailyMarketUniverse()
    const body = await req.json().catch(() => ({})) as { tickers?: string[] }
    const universe = resolveTradingCycleTickers(100)
    const requested: string[] = Array.isArray(body.tickers) && body.tickers.length > 0
      ? body.tickers
      : universe.tickers
    const queued = popCycleQueue()
    const tickers = [...new Set([...queued, ...requested])]

    console.log(
      `[TradingCycle] 🚀 Iniciando ciclo con ${tickers.length} tickers (source=${universe.source} universe=${universe.universeSize}):`,
      tickers,
      queued.length ? `(cola Telegram ${queued.join(",")})` : "",
    )

    const result = await engine.runCycle(tickers)

    const daily = getDailyMarketUniverse()
    void sendCyclePremiumReport(result, {
      analyzed: tickers.length,
      universeScanned: daily?.screenerCount ?? universe.universeSize,
      universeFiltered: daily?.tickers.length ?? universe.universeSize,
    }).catch((err) => console.warn('[TradingCycle] Premium report failed:', err))

    // Guardar en memoria global para el dashboard (en prod usar DB)
    global.__lastTradingCycle = result

    publishInvestmentEvent({
      type: 'cycle_complete',
      at: new Date().toISOString(),
      payload: result,
    })

    // Direct export (also covered by instrumentation listener when configured).
    void import('@/lib/integrations/webhook-export')
      .then(({ exportToWebhook }) =>
        exportToWebhook('cycle_complete', {
          tickers,
          systemHalted: result.systemHalted,
          orderCount: result.orders?.length ?? 0,
        }),
      )
      .catch(() => undefined)

    if (result.systemHalted) {
      publishInvestmentEvent({
        type: 'circuit_breaker',
        at: new Date().toISOString(),
        payload: { reason: result.haltReason ?? 'halted' },
      })
    }

    const pendingOrders = result.orders.filter(o => o.status === 'PENDING_APPROVAL')
    console.log(`[TradingCycle] ✅ Ciclo completado. Pendientes de aprobación: ${pendingOrders.length}/${result.orders.length}`)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[TradingCycle] Error en ciclo:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error en ciclo de trading' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const risk = RiskManager.getInstance()
  const approvals = OrderApprovalGate.getInstance()

  await expireStalePendingApprovals()
  await refreshDailyMarketUniverse().catch(() => undefined)

  let dynamicSizing = null
  try {
    const acct = await fetchTradingAccountSnapshot()
    dynamicSizing = computeDynamicSizing({
      cashUSD: acct.cashUSD,
      navUSD: acct.navUSD,
    })
  } catch {
    dynamicSizing = null
  }

  return NextResponse.json({
    systemHalted: risk.isHalted(),
    haltReason: risk.getHaltReason(),
    dailyTradeCount: risk.getDailyTradeCount(),
    pendingApprovals: approvals.listPending(),
    pendingApprovalCount: countPendingApprovals(),
    telegramApprovalRequired: TRADING_CONFIG.semiAutomatic.telegramApprovalRequired,
    approvalTimeoutMinutes: TRADING_CONFIG.semiAutomatic.approvalTimeoutMinutes,
    lastCycle: global.__lastTradingCycle ?? null,
    cycleUniverse: resolveTradingCycleTickers(100),
    dynamicSizing,
    config: {
      maxPositionPct: TRADING_CONFIG.risk.maxPositionPct,
      dailyLossLimitPct: TRADING_CONFIG.risk.dailyLossLimitPct,
      minConfidence: TRADING_CONFIG.ai.minConfidenceToTrade,
      paperTrading: TRADING_CONFIG.ibkr.paperTrading,
      allowedTickers: TRADING_CONFIG.allowedTickers,
      dynamicSizingPolicy: TRADING_CONFIG.risk.dynamicSizing,
    },
  })
}
