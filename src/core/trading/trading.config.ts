/**
 * ForgeOS Trading Module — Configuración de riesgo
 * Parámetros definidos por el usuario. NO modificar sin revisión.
 */

export const TRADING_CONFIG = {
  // ── Control de riesgo ──────────────────────────────────────────
  risk: {
    /** Máximo % del NAV total que se puede arriesgar por operación */
    maxPositionPct: 0.10,           // 10%
    /** Si el P&L del día supera esta pérdida, el sistema se detiene */
    dailyLossLimitPct: 0.10,        // 10% del NAV
    /** Máximo número de posiciones abiertas simultáneas */
    maxOpenPositions: 5,
    /** Stop-loss automático por posición */
    defaultStopLossPct: 0.05,       // 5%
    /** Take-profit automático por posición */
    defaultTakeProfitPct: 0.10,     // 10%
  },

  // ── Motor de IA ────────────────────────────────────────────────
  ai: {
    model: 'claude-sonnet-4-6',
    /** Ciclo de análisis en ms (5 min por defecto) */
    analysisCycleMs: 5 * 60 * 1000,
    /** Confianza mínima (0-1) para ejecutar una orden — temporal pruebas */
    minConfidenceToTrade: 0.50,
    /** Máximo de operaciones por día */
    maxDailyTrades: 20,
  },

  // ── Multi-IA (scanner masivo + confirmación) ───────────────────
  aiProviders: {
    primary: 'groq' as const,
    confirmation: 'claude-haiku' as const,
    fallback: 'groq' as const,
    groq: {
      model: 'llama-3.3-70b-versatile',
      maxConcurrent: 10,
      rateLimit: 30,
    },
    claude: {
      model: 'claude-haiku-4-5',
      onlyForConfirmation: true,
    },
  },

  // ── IBKR ──────────────────────────────────────────────────────
  ibkr: {
    /** URL del MCP de Interactive Brokers */
    mcpUrl: 'https://api.ibkr.com/v1/api/mcp',
    /** Tipo de orden por defecto */
    defaultOrderType: 'MKT' as 'MKT' | 'LMT',
    /** Activar modo paper trading (true = sin dinero real) */
    paperTrading: true,
  },

  // ── Universo de activos permitidos ────────────────────────────
  // Solo se operará en estos tickers. Ampliar con criterio.
  allowedTickers: [
    // USA — ETFs líquidos
    'SPY', 'QQQ', 'IWM', 'EEM', 'TLT', 'ARKK',
    // USA — Acciones de alta liquidez
    'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META',
    // Europa (ADRs NYSE/NASDAQ — horario USA)
    'EZU', 'VGK', 'ASML', 'SAP', 'SHOP',
    // Europa internacional (LSE/XETRA — ADR USA)
    'SHEL', 'BP',
    // Asia (horario 1:00-9:30 España)
    'EWJ', 'FXI', 'EWY', 'BABA', 'NIO', 'TSM',
    // Emergentes
    'MELI', 'GRAB', 'DLO', 'IBN',
    // Crypto ETFs (casi 24h)
    'IBIT', 'FETH', 'BITO', 'ARKB',
    // Materias primas (casi 24h via ETFs)
    'GLD', 'SLV', 'USO', 'UNG', 'PDBC',
    // Volatilidad y cobertura
    'VXX', 'UVXY', 'SQQQ', 'TQQQ',
  ],

  // ── Horario de trading (hora española — Europe/Madrid) ────────
  schedule: {
    timeZone: 'Europe/Madrid',
    /** Premarket USA: 09:00 - 15:29 hora española (≈ 04:00-09:29 ET) */
    preMarketStartHour: 9,
    preMarketStartMinute: 0,
    preMarketEndHour: 15,
    preMarketEndMinute: 29,
    /** Mercado regular USA: 15:30 - 22:00 hora española (≈ 09:30-16:00 ET) */
    regularOpenHour: 15,
    regularOpenMinute: 30,
    regularCloseHour: 22,
    regularCloseMinute: 0,
    /** Aftermarket USA: 22:00 - 01:00 hora española (≈ 16:00-19:00 ET) */
    afterMarketStartHour: 22,
    afterMarketStartMinute: 0,
    afterMarketEndHour: 1,
    afterMarketEndMinute: 0,
    /** Mercado cerrado: 01:00 - 09:00 hora española */
    closedStartHour: 1,
    closedStartMinute: 0,
    closedEndHour: 9,
    closedEndMinute: 0,
    /** Confianza mínima en premarket/aftermarket (temporal pruebas) */
    extendedHoursMinConfidence: 0.60,
    /** Tamaño máximo de orden en extended hours (50% del normal) */
    extendedHoursMaxOrderSizeFactor: 0.50,
    /** Volumen mínimo en premarket/aftermarket (acciones) */
    extendedHoursMinVolume: 100_000,
    /** No operar los últimos 15 min antes del cierre regular */
    noTradeBeforeCloseMin: 15,
  },

  // ── Aprobación semi-automática ────────────────────────────────
  autoApproval: {
    enabled: true,
    autoApproveThreshold: {
      minConfidence: 0.65,
      requirePattern: true,
      requireNewsSentiment: true,
      maxPositionValueUSD: 50,
      maxDailyAutoTrades: 5,
    },
    notifyAndWait: {
      confidenceRange: [0.50, 0.65] as const,
      waitMinutes: 10,
      executeIfNoResponse: false,
    },
    alwaysHold: {
      belowConfidence: 0.50,
      marketVolatilityHigh: true,
      newsConflicting: true,
    },
  },
} as const

export type TradingConfig = typeof TRADING_CONFIG
