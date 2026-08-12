'use client'

/**
 * ForgeOS — /investment
 * Dashboard de trading automatizado en tiempo real.
 */

// Temporary build/route detection log (remove after Hetzner verifies .next/server/app/investment)
console.log('[ForgeOS build] app/investment/page.tsx loaded — /investment route present')

import { useState, useEffect, useCallback } from 'react'
import { TRADING_CONFIG } from '@/src/core/trading/trading.config'
import { useInvestmentStream } from '@/lib/investment/use-investment-stream'
import {
  TICKER_GROUPS,
  UNGROUPED_TICKERS,
  ALL_MONITOR_TICKERS,
  type TickerGroup,
} from '@/src/core/trading/ticker-groups'

type OrderResult = {
  orderId?: string
  status: 'EXECUTED' | 'REJECTED_RISK' | 'REJECTED_CONFIDENCE' | 'HOLD' | 'ERROR'
  ticker: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  sharesOrValue?: number
  price?: number
  reason: string
  signal: { confidence: number; reasoning: string; urgency: string }
  timestamp: string
  stopLoss?: number
  takeProfit?: number
}

type CycleResult = {
  cycleId: string
  startedAt: string
  completedAt: string
  accountSnapshot: { navUSD: number; cashUSD: number; dailyPnlUSD: number }
  orders: OrderResult[]
  systemHalted: boolean
  haltReason?: string
}

type SystemStatus = {
  systemHalted: boolean
  haltReason: string
  dailyTradeCount: number
  lastCycle: CycleResult | null
  config: {
    maxPositionPct: number
    dailyLossLimitPct: number
    minConfidence: number
    paperTrading: boolean
    allowedTickers: string[]
  }
}

const MONITOR_TICKERS_STORAGE_KEY = 'forgeos-monitor-tickers'

function getDefaultSelectedTickers(): string[] {
  const europa = TICKER_GROUPS.find((g) => g.id === 'europa')
  return europa ? [...europa.tickers] : (TRADING_CONFIG.allowedTickers.slice(0, 5) as string[])
}

function loadSelectedTickers(): string[] {
  if (typeof window === 'undefined') return getDefaultSelectedTickers()
  try {
    const raw = window.localStorage.getItem(MONITOR_TICKERS_STORAGE_KEY)
    if (!raw) return getDefaultSelectedTickers()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : getDefaultSelectedTickers()
  } catch {
    return getDefaultSelectedTickers()
  }
}

const STATUS_COLORS: Record<OrderResult['status'], string> = {
  EXECUTED: '#1baf7a',
  REJECTED_RISK: '#e8505b',
  REJECTED_CONFIDENCE: '#eb6834',
  HOLD: '#898781',
  ERROR: '#e8505b',
}

const STATUS_LABELS: Record<OrderResult['status'], string> = {
  EXECUTED: '✅ Ejecutada',
  REJECTED_RISK: '🛑 Riesgo',
  REJECTED_CONFIDENCE: '⚠️ Baja confianza',
  HOLD: '⏸ Hold',
  ERROR: '❌ Error',
}

export default function InvestmentPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [selectedTickers, setSelectedTickers] = useState<string[]>(getDefaultSelectedTickers)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loaded = loadSelectedTickers()
    const europa = TICKER_GROUPS.find((g) => g.id === 'europa')
    const merged = europa
      ? [...new Set([...loaded, ...europa.tickers])]
      : loaded
    setSelectedTickers(merged)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MONITOR_TICKERS_STORAGE_KEY, JSON.stringify(selectedTickers))
  }, [selectedTickers])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/trading/cycle')
      const data = await res.json()
      setStatus(data)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error fetching status:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useInvestmentStream((event) => {
    if (
      event.type === 'signal' ||
      event.type === 'order_executed' ||
      event.type === 'circuit_breaker' ||
      event.type === 'cycle_complete'
    ) {
      void fetchStatus()
    }
  })

  // Auto-ciclo cada 5 minutos
  useEffect(() => {
    if (!autoMode) return
    const interval = setInterval(() => runCycle(), TRADING_CONFIG.ai.analysisCycleMs)
    return () => clearInterval(interval)
  }, [autoMode, selectedTickers])

  const runCycle = async () => {
    if (isRunning) return
    setIsRunning(true)
    try {
      await fetch('/api/trading/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: selectedTickers }),
      })
      await fetchStatus()
    } catch (err) {
      console.error('Error running cycle:', err)
    } finally {
      setIsRunning(false)
    }
  }

  const toggleHalt = async () => {
    const action = status?.systemHalted ? 'resume' : 'halt'
    await fetch(`/api/trading/cycle?action=${action}`, { method: 'POST' })
    await fetchStatus()
  }

  const toggleTicker = (ticker: string) => {
    setSelectedTickers(prev =>
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    )
  }

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const toggleGroupTickers = (tickers: readonly string[]) => {
    setSelectedTickers(prev => {
      const allSelected = tickers.every(t => prev.includes(t))
      if (allSelected) {
        return prev.filter(t => !tickers.includes(t))
      }
      return [...new Set([...prev, ...tickers])]
    })
  }

  const renderTickerGroup = (group: TickerGroup) => {
    const collapsed = collapsedGroups[group.id] ?? false
    const activeInGroup = group.tickers.filter(t => selectedTickers.includes(t)).length
    const allOn = activeInGroup === group.tickers.length

    return (
      <div key={group.id} style={styles.tickerGroup}>
        <div style={styles.tickerGroupHeader}>
          <button
            type="button"
            onClick={() => toggleGroupCollapse(group.id)}
            style={styles.tickerGroupTitleBtn}
            aria-expanded={!collapsed}
          >
            <span style={styles.tickerGroupChevron}>{collapsed ? '▸' : '▾'}</span>
            <span>{group.emoji} {group.label}</span>
            <span style={styles.tickerGroupCount}>({group.tickers.length})</span>
            {activeInGroup > 0 && (
              <span style={styles.tickerGroupActive}>{activeInGroup} activos</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleGroupTickers(group.tickers)}
            style={{ ...styles.groupToggle, background: allOn ? '#1baf7a' : '#2a3a4d' }}
            title={allOn ? 'Desactivar todos' : 'Activar todos'}
            aria-label={allOn ? `Desactivar todos en ${group.label}` : `Activar todos en ${group.label}`}
          >
            <div style={{ ...styles.toggleKnob, transform: allOn ? 'translateX(16px)' : 'translateX(0)' }} />
          </button>
        </div>
        {!collapsed && (
          <div style={styles.tickerGrid}>
            {group.tickers.map(ticker => (
              <button
                key={ticker}
                type="button"
                onClick={() => toggleTicker(ticker)}
                style={{
                  ...styles.tickerBtn,
                  background: selectedTickers.includes(ticker) ? '#2a78d6' : 'transparent',
                  color: selectedTickers.includes(ticker) ? '#fff' : '#c5d4e4',
                  borderColor: selectedTickers.includes(ticker) ? '#2a78d6' : '#2a3a4d',
                }}
              >
                {ticker}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const cycle = status?.lastCycle
  const executed = cycle?.orders.filter(o => o.status === 'EXECUTED') ?? []
  const nav = cycle?.accountSnapshot.navUSD ?? 0
  const cash = cycle?.accountSnapshot.cashUSD ?? 0
  const dailyPnl = cycle?.accountSnapshot.dailyPnlUSD ?? 0

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Conectando con ForgeOS Trading...</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.liveDot} />
          <h1 style={styles.title}>ForgeOS Trading</h1>
          <span style={styles.version}>
            v1.0 · {(status?.config?.paperTrading ?? TRADING_CONFIG.ibkr.paperTrading) ? '📄 PAPER' : '💰 REAL'}
          </span>
        </div>
        <div style={styles.headerRight}>
          {lastRefresh && (
            <span style={styles.refreshLabel}>
              Actualizado {lastRefresh.toLocaleTimeString('es-ES')}
            </span>
          )}
          <button onClick={fetchStatus} style={styles.btnSecondary}>↻ Refresh</button>
          <button
            onClick={toggleHalt}
            style={{ ...styles.btn, background: status?.systemHalted ? '#1baf7a' : '#e8505b' }}
          >
            {status?.systemHalted ? '▶ Reanudar' : '⏹ Detener'}
          </button>
        </div>
      </div>

      {/* Alert si sistema detenido */}
      {status?.systemHalted && (
        <div style={styles.haltBanner}>
          🛑 <strong>Sistema detenido:</strong> {status.haltReason}
        </div>
      )}

      {/* KPIs */}
      <div style={styles.kpiRow}>
        {[
          { label: 'NAV Total', value: `$${nav.toFixed(2)}`, sub: 'Valor neto liquidación' },
          { label: 'Cash disponible', value: `$${cash.toFixed(2)}`, sub: 'Para nuevas órdenes' },
          { label: 'P&L hoy', value: `${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toFixed(2)}`, sub: 'Resultado del día', color: dailyPnl >= 0 ? '#1baf7a' : '#e8505b' },
          { label: 'Operaciones hoy', value: `${status?.dailyTradeCount ?? 0}/${TRADING_CONFIG.ai.maxDailyTrades}`, sub: 'Límite diario' },
          { label: 'Último ciclo', value: cycle ? new Date(cycle.completedAt).toLocaleTimeString('es-ES') : '—', sub: `${executed.length} órdenes ejecutadas` },
        ].map((kpi, i) => (
          <div key={i} style={styles.kpi}>
            <div style={styles.kpiLabel}>{kpi.label}</div>
            <div style={{ ...styles.kpiValue, color: kpi.color ?? 'var(--text-primary, #1a1918)' }}>{kpi.value}</div>
            <div style={styles.kpiSub}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.mainGrid}>
        {/* Panel izquierdo — Control */}
        <div style={styles.controlPanel}>
          <div style={styles.cardTitle}>⚙️ Control del sistema</div>

          {/* Auto modo */}
          <div style={styles.controlRow}>
            <span style={styles.controlLabel}>Modo automático (c/5 min)</span>
            <button
              onClick={() => setAutoMode(v => !v)}
              style={{ ...styles.toggle, background: autoMode ? '#1baf7a' : '#c8c6be' }}
            >
              <div style={{ ...styles.toggleKnob, transform: autoMode ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {/* Tickers seleccionados — agrupados por región */}
          <div style={styles.monitorSection}>
            <div style={styles.monitorSectionHeader}>
              <div style={styles.sectionLabelDark}>Activos a monitorizar</div>
              <span style={styles.monitorActiveCount}>
                {selectedTickers.length}/{ALL_MONITOR_TICKERS.length} activos
              </span>
            </div>
            <div style={styles.tickerGroupsWrap}>
              {TICKER_GROUPS.map(renderTickerGroup)}
              {UNGROUPED_TICKERS.length > 0 && renderTickerGroup({
                id: 'otros',
                label: 'Otros',
                emoji: '📦',
                tickers: UNGROUPED_TICKERS,
              })}
            </div>
          </div>

          {/* Parámetros de riesgo */}
          <div style={styles.sectionLabel}>Parámetros activos</div>
          {[
            { label: 'Riesgo máx/operación', value: `${(TRADING_CONFIG.risk.maxPositionPct * 100).toFixed(0)}% NAV` },
            { label: 'Límite pérdida diaria', value: `${(TRADING_CONFIG.risk.dailyLossLimitPct * 100).toFixed(0)}% NAV` },
            { label: 'Stop-loss por posición', value: `${(TRADING_CONFIG.risk.defaultStopLossPct * 100).toFixed(0)}%` },
            { label: 'Take-profit por posición', value: `${(TRADING_CONFIG.risk.defaultTakeProfitPct * 100).toFixed(0)}%` },
            { label: 'Confianza mínima IA', value: `${(TRADING_CONFIG.ai.minConfidenceToTrade * 100).toFixed(0)}%` },
          ].map((param, i) => (
            <div key={i} style={styles.paramRow}>
              <span style={styles.paramLabel}>{param.label}</span>
              <span style={styles.paramValue}>{param.value}</span>
            </div>
          ))}

          {/* Botón ejecutar ciclo */}
          <button
            onClick={runCycle}
            disabled={isRunning || status?.systemHalted || selectedTickers.length === 0}
            style={{
              ...styles.btnPrimary,
              opacity: (isRunning || status?.systemHalted || selectedTickers.length === 0) ? 0.5 : 1,
              cursor: (isRunning || status?.systemHalted) ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? '⏳ Analizando mercado...' : '🚀 Ejecutar ciclo ahora'}
          </button>
        </div>

        {/* Panel derecho — Órdenes del último ciclo */}
        <div style={styles.ordersPanel}>
          <div style={styles.cardTitle}>
            📋 Órdenes del último ciclo
            {cycle && <span style={styles.cycleId}>{cycle.cycleId}</span>}
          </div>

          {!cycle || cycle.orders.length === 0 ? (
            <div style={styles.emptyState}>
              Sin ciclos ejecutados aún. Pulsa "Ejecutar ciclo" para comenzar.
            </div>
          ) : (
            <div style={styles.ordersList}>
              {cycle.orders.map((order, i) => (
                <div key={i} style={styles.orderRow}>
                  <div style={styles.orderLeft}>
                    <div style={styles.orderTicker}>{order.ticker}</div>
                    <div style={{ ...styles.orderStatus, color: STATUS_COLORS[order.status] }}>
                      {STATUS_LABELS[order.status]}
                    </div>
                  </div>
                  <div style={styles.orderCenter}>
                    <div style={styles.orderReason}>{order.reason}</div>
                    <div style={styles.orderMeta}>
                      Confianza: {(order.signal.confidence * 100).toFixed(0)}% ·
                      Urgencia: {order.signal.urgency}
                      {order.price ? ` · $${order.price.toFixed(2)}` : ''}
                    </div>
                    {order.stopLoss && (
                      <div style={styles.orderLevels}>
                        🔴 SL: ${order.stopLoss.toFixed(2)} &nbsp;
                        🟢 TP: ${order.takeProfit?.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={styles.orderRight}>
                    <div style={{ color: order.direction === 'BUY' ? '#1baf7a' : order.direction === 'SELL' ? '#e8505b' : '#898781', fontWeight: 500, fontSize: 13 }}>
                      {order.direction}
                    </div>
                    {order.sharesOrValue && (
                      <div style={styles.orderValue}>${order.sharesOrValue.toFixed(2)}</div>
                    )}
                    <div style={styles.orderTime}>
                      {new Date(order.timestamp).toLocaleTimeString('es-ES')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Estilos inline (sin dependencias externas) ────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { padding: '1.5rem', maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 },
  spinner: { width: 32, height: 32, border: '3px solid #e1e0d9', borderTop: '3px solid #2a78d6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { color: '#898781', fontSize: 14 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  liveDot: { width: 8, height: 8, borderRadius: '50%', background: '#1baf7a', display: 'inline-block' },
  title: { fontSize: 20, fontWeight: 600, margin: 0 },
  version: { fontSize: 12, color: '#898781', background: '#f3f2ee', padding: '2px 8px', borderRadius: 4 },
  refreshLabel: { fontSize: 12, color: '#898781' },
  btn: { padding: '11px 14px', minHeight: 44, borderRadius: 8, border: 'none', color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' },
  btnSecondary: { padding: '11px 14px', minHeight: 44, borderRadius: 8, border: '0.5px solid #c8c6be', background: 'transparent', fontSize: 13, cursor: 'pointer' },
  haltBanner: { background: '#fdf2f2', border: '1px solid #e8505b', borderRadius: 8, padding: '10px 16px', marginBottom: '1.25rem', color: '#e8505b', fontSize: 13 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: '1.25rem' },
  kpi: { background: '#f8f7f4', borderRadius: 10, padding: '0.75rem 1rem' },
  kpiLabel: { fontSize: 11, color: '#898781', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 },
  kpiValue: { fontSize: 20, fontWeight: 600 },
  kpiSub: { fontSize: 11, color: '#898781', marginTop: 2 },
  mainGrid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 },
  controlPanel: { background: '#fff', border: '0.5px solid #e1e0d9', borderRadius: 12, padding: '1rem' },
  ordersPanel: { background: '#fff', border: '0.5px solid #e1e0d9', borderRadius: 12, padding: '1rem', minHeight: 400 },
  cardTitle: { fontSize: 14, fontWeight: 500, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cycleId: { fontSize: 10, color: '#898781', fontFamily: 'monospace' },
  controlRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  controlLabel: { fontSize: 13, color: '#1a1918' },
  toggle: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' },
  toggleKnob: { position: 'absolute', top: 2, left: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: '#898781', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 14 },
  monitorSection: {
    marginTop: 14,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(11, 17, 26, 0.92)',
    border: '1px solid #1f2d3d',
  },
  monitorSectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabelDark: { fontSize: 11, fontWeight: 500, color: '#9fb4c9', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 },
  monitorActiveCount: { fontSize: 11, color: '#f8b84e', fontWeight: 500, fontVariantNumeric: 'tabular-nums' },
  tickerGroupsWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  tickerGroup: { borderRadius: 6, border: '1px solid #1f2d3d', background: 'rgba(15, 23, 34, 0.6)', overflow: 'hidden' },
  tickerGroupHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', gap: 8 },
  tickerGroupTitleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: '#dde9f7',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
  },
  tickerGroupChevron: { fontSize: 10, color: '#9fb4c9', width: 12 },
  tickerGroupCount: { color: '#9fb4c9', fontWeight: 400 },
  tickerGroupActive: { marginLeft: 'auto', fontSize: 10, color: '#1baf7a', fontWeight: 500 },
  groupToggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  tickerGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 8px 8px' },
  tickerBtn: { padding: '4px 10px', borderRadius: 6, border: '0.5px solid', fontSize: 12, cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' },
  paramRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #f3f2ee' },
  paramLabel: { fontSize: 12, color: '#898781' },
  paramValue: { fontSize: 12, fontWeight: 500 },
  btnPrimary: { width: '100%', marginTop: 16, padding: '12px', minHeight: 44, borderRadius: 8, border: 'none', background: '#2a78d6', color: '#fff', fontWeight: 500, fontSize: 14, transition: 'opacity 0.2s' },
  emptyState: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#898781', fontSize: 13, textAlign: 'center' },
  ordersList: { display: 'flex', flexDirection: 'column', gap: 8 },
  orderRow: { display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 8, background: '#f8f7f4', alignItems: 'flex-start' },
  orderLeft: { minWidth: 80 },
  orderTicker: { fontSize: 14, fontWeight: 600 },
  orderStatus: { fontSize: 11, marginTop: 2 },
  orderCenter: { flex: 1 },
  orderReason: { fontSize: 12, color: '#1a1918', marginBottom: 2 },
  orderMeta: { fontSize: 11, color: '#898781' },
  orderLevels: { fontSize: 11, color: '#898781', marginTop: 2 },
  orderRight: { textAlign: 'right', minWidth: 80 },
  orderValue: { fontSize: 12, color: '#898781', marginTop: 2 },
  orderTime: { fontSize: 11, color: '#c8c6be', marginTop: 4 },
}
