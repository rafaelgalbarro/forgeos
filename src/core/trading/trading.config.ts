/**
 * ForgeOS Trading Module — Configuración de riesgo
 * Parámetros definidos por el usuario. NO modificar sin revisión.
 */

export const TRADING_CONFIG = {
  // ── Control de riesgo ──────────────────────────────────────────
  risk: {
    /**
     * Legacy NAV cap — portfolio optimizer may further reduce.
     * Primary stock sizing: computeDynamicSizing() from live IBKR cash.
     */
    maxPositionPct: 0.20,
    /** Si el P&L del día supera esta pérdida, el sistema se detiene */
    dailyLossLimitPct: 0.10,
    /** Diversification soft cap (legacy); live limit from dynamicSizing */
    maxOpenPositions: 20,
    /** Default SL: -1.5% scalping baseline */
    defaultStopLossPct: 0.015,
    /** Default TP: +3% scalping baseline */
    defaultTakeProfitPct: 0.03,
    /** Trailing stop: 1.5% desde el máximo alcanzado */
    trailingStopPct: 0.015,
    /** Cash-based dynamic sizing (see dynamic-sizing.ts) */
    dynamicSizing: {
      maxPctNormal: 0.20,
      maxPctHighConfidence: 0.30,
      highConfidenceThreshold: 0.80,
      minOrderUSD: 10,
      minCashToTradeUSD: 10,
      analysisOnlyCashUSD: 10,
      deployableCashPct: 0.50,
      /** maxPositions = floor(cash / 15), clamped [3, 20] */
      positionCashDivisor: 15,
      maxOpenPositionsCap: 20,
      minOpenPositions: 3,
      takeProfitRatio: 2.6,
    },
    /** FOREX IDEALPRO sizing gates */
    forex: {
      /** Keep FOREX enabled but only execute when cash is strong enough. */
      minCashUSD: 2_000,
      /** @deprecated use minCashUSD — kept so older snapshots still type-check. */
      minNavUSD: 50,
      riskPctNav: 1.0,
      minUnits: 25_000,
      maxUnits: 25_000,
      /** units = (riskAmount / stopPips) * unitsPerPipEuro */
      unitsPerPipEuro: 10_000,
      defaultStopPips: 20,
    },
  },

  // ── Motor de IA ────────────────────────────────────────────────
  ai: {
    model: 'claude-sonnet-4-6',
    /** Ciclo rápido: 3 minutos */
    analysisCycleMs: 3 * 60 * 1000,
    /** Confianza mínima (0-1) */
    minConfidenceToTrade: 0.60,
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
    /**
     * Paper trading: true = sin dinero real.
     * When LIVE_TRADING_ENABLED=true and IBKR_READ_ONLY=false → live (false).
     * Evaluated at module load from process.env (.env.local / spawn env).
     */
    paperTrading: !(
      String(process.env.LIVE_TRADING_ENABLED ?? "").trim().toLowerCase() === "true" &&
      String(process.env.IBKR_READ_ONLY ?? "true").trim().toLowerCase() === "false"
    ),
  },

  // ── Universo de activos permitidos ────────────────────────────
  // Solo se operará en estos tickers. Ampliar con criterio.
  allowedTickers: [
    // USA — ETFs líquidos
    'SPY', 'QQQ', 'IWM', 'EEM', 'TLT', 'ARKK',
    // USA — Acciones de alta liquidez
    'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META',
    // Europa ETFs / ADRs
    'EZU', 'VGK', 'EWG', 'EWU', 'ASML', 'SAP', 'SHOP', 'SHEL', 'BP',
    // Asia ETFs / ADRs
    'EWJ', 'FXI', 'EWY', 'EWA', 'BABA', 'NIO', 'TSM',
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
    /** Mercado regular USA: 15:30 - 21:00 hora española */
    regularOpenHour: 15,
    regularOpenMinute: 30,
    regularCloseHour: 21,
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

  // ── Modo semi-automático (Telegram) ─────────────────────────────
  semiAutomatic: {
    /** 100% automático: no requiere aprobación Telegram. */
    telegramApprovalRequired:
      String(process.env.TELEGRAM_APPROVAL_REQUIRED ?? "false").trim().toLowerCase() === "true",
    approvalTimeoutMinutes: Math.max(
      1,
      Number(process.env.APPROVAL_TIMEOUT_MINUTES ?? 5) || 5,
    ),
  },

  // ── Aprobación automática ────────────────────────────────
  autoApproval: {
    /** Auto-ejecutar si confianza >= minConfidence. */
    enabled:
      String(process.env.TELEGRAM_APPROVAL_REQUIRED ?? "false").trim().toLowerCase() !== "true",
    autoApproveThreshold: {
      minConfidence: 0.6,
      requirePattern: false,
      requireNewsSentiment: false,
      maxPositionValueUSD: 500,
      maxDailyAutoTrades: 40,
    },
    notifyAndWait: {
      confidenceRange: [0.5, 0.6] as const,
      waitMinutes: Math.max(1, Number(process.env.APPROVAL_TIMEOUT_MINUTES ?? 5) || 5),
      executeIfNoResponse: false,
    },
    alwaysHold: {
      belowConfidence: 0.6,
      marketVolatilityHigh: false,
      newsConflicting: false,
    },
  },
} as const

export type TradingConfig = typeof TRADING_CONFIG
