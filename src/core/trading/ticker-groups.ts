/**
 * Regional / asset-class groupings for the "Activos a monitorizar" panel.
 * Tickers must be a subset of TRADING_CONFIG.allowedTickers.
 */

import { TRADING_CONFIG } from './trading.config'

export type TickerGroup = {
  id: string
  label: string
  emoji: string
  tickers: readonly string[]
}

export const TICKER_GROUPS: readonly TickerGroup[] = [
  {
    id: 'usa',
    label: 'USA',
    emoji: '🇺🇸',
    tickers: [
      'SPY', 'QQQ', 'IWM', 'EEM', 'TLT', 'ARKK',
      'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META',
    ],
  },
  {
    id: 'europa',
    label: 'Europa',
    emoji: '🇪🇺',
    tickers: ['EZU', 'VGK', 'ASML', 'SAP', 'SHOP', 'SHEL', 'BP'],
  },
  {
    id: 'asia',
    label: 'Asia',
    emoji: '🌏',
    tickers: ['EWJ', 'FXI', 'EWY', 'BABA', 'NIO', 'JD', 'BIDU', 'TCEHY', 'SE', 'GRAB', 'SONY', 'TSM'],
  },
  {
    id: 'emergentes',
    label: 'Emergentes',
    emoji: '🌍',
    tickers: ['MELI', 'GRAB', 'DLO', 'IBN'],
  },
  {
    id: 'crypto',
    label: 'Crypto',
    emoji: '₿',
    tickers: ['IBIT', 'FETH', 'BITO', 'ARKB', 'BTC', 'ETH', 'LTC', 'BCH', 'XRP'],
  },
  {
    id: 'materias',
    label: 'Materias',
    emoji: '🛢',
    tickers: ['GLD', 'SLV', 'USO', 'UNG', 'PDBC'],
  },
  {
    id: 'volatilidad',
    label: 'Volatilidad',
    emoji: '⚡',
    tickers: ['VXX', 'UVXY', 'SQQQ', 'TQQQ'],
  },
] as const

const allowed = new Set<string>(TRADING_CONFIG.allowedTickers as readonly string[])
const grouped = new Set<string>(TICKER_GROUPS.flatMap(g => g.tickers))

/** Tickers in allowedTickers but not assigned to any group */
export const UNGROUPED_TICKERS = (TRADING_CONFIG.allowedTickers as readonly string[]).filter(
  t => !grouped.has(t),
)

/** Validate grouping covers all allowed tickers at build time */
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  for (const group of TICKER_GROUPS) {
    for (const ticker of group.tickers) {
      if (!allowed.has(ticker)) {
        console.warn(`[ticker-groups] ${ticker} in ${group.id} is not in allowedTickers`)
      }
    }
  }
  for (const ticker of UNGROUPED_TICKERS) {
    console.warn(`[ticker-groups] ${ticker} is not assigned to any group`)
  }
}

export const ALL_MONITOR_TICKERS = [
  ...TICKER_GROUPS.flatMap(g => g.tickers),
  ...UNGROUPED_TICKERS,
] as const
