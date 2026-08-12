/**
 * ForgeOS TradingAgent
 * Llama a Claude via API de Anthropic para analizar el mercado
 * y generar señales de compra/venta con nivel de confianza.
 */

import { TRADING_CONFIG } from '../trading.config'
import type { AnalysisMultiTimeframeContext } from '@/lib/market-data/multi-timeframe'

export type TradeSignal = {
  ticker: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  confidence: number          // 0.0 – 1.0
  reasoning: string
  suggestedOrderType: 'MKT' | 'LMT'
  suggestedLimitPrice?: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH'
}

export type AnalysisNewsContext = {
  items: Array<{ title: string; source: string; sentiment: string; hoursAgo: number }>
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  newsCount24h: number
}

export type AnalysisTechnicalsContext = {
  trend: {
    ema20: number | null
    ema50: number | null
    ema200: number | null
    macd: { line: number; signal: number; histogram: number } | null
    ichimoku: { aboveCloud: boolean; tenkan: number; kijun: number } | null
    adx: number | null
  }
  momentum: {
    rsi: number | null
    rsiZone: string
    stochRsi: { k: number; d: number } | null
    cci: number | null
    williamsR: number | null
  }
  volatility: {
    bollingerBands: { upper: number; middle: number; lower: number; percentB: number } | null
    atr: number | null
    squeeze: { active: boolean } | null
  }
  volume: {
    vwap: number | null
    obv: number | null
    relativeVolume: number | null
  }
  levels: {
    fibonacci: Array<{ level: string; price: number }>
    support: number[]
    resistance: number[]
  }
}

export type AnalysisPatternsContext = {
  candlesticks: Array<{ name: string; type: string; confidence: number }>
  price: Array<{ name: string; type: string; confidence: number; targetPrice?: number }>
  divergences: Array<{ indicator: string; type: string; confidence: number }>
  signals: Array<{ name: string; description: string; strength: number }>
}

export type AnalysisSentimentContext = {
  compositeScore: number
  signals: string[]
  stocktwits: {
    bullishPct: number | null
    bearishPct: number | null
    messageCount24h: number
    trending: boolean
  } | null
  reddit: {
    mentionCount24h: number
    wsbMentions: number
    stocksMentions: number
    overallSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    mentionSpike: boolean
  } | null
  macro: {
    fearGreedIndex: number | null
    fearGreedLabel: string | null
    vix: number | null
    vixChangePct: number | null
    extremeGreed: boolean
    extremeFear: boolean
    highVolatility: boolean
  }
}

/** Inter-market / macro block (Phase D) — optional on each analysis. */
export type AnalysisMacroContext = {
  tltChangePct: number | null
  riskBias: 'risk_on' | 'risk_off' | 'neutral' | 'NO_DATA'
  riskOff: boolean
  dollarSymbol: string | null
  dollarChangePct: number | null
  gldChangePct: number | null
  usoChangePct: number | null
  vix: number | null
  vixChangePct: number | null
  yieldSpread2s10s: number | null
  recessionSignal: 'sí' | 'no' | 'NO_DATA'
  strongestSector: { etf: string; name: string; changePct: number } | null
  weakestSector: { etf: string; name: string; changePct: number } | null
  formattedBlock: string
  computedAt: string
}

export type MarketContext = {
  ticker: string
  currentPrice: number
  change1d: number            // % cambio en el día
  high52w: number
  low52w: number
  volume: number
  bid: number
  ask: number
  marketSession?: {
    exchange: string
    timeZone: string
    sessionLabel: string
    localTime: string
    isOpenNow: boolean
    usPhase?: 'PRE_MARKET' | 'REGULAR' | 'AFTER_MARKET' | 'CLOSED'
  } | null
  usExtendedHours?: boolean
  news?: AnalysisNewsContext
  sentiment?: AnalysisSentimentContext
  /** Inter-market context (TLT/DXY/VIX/yield/sectors) */
  macro?: AnalysisMacroContext
  technicals?: AnalysisTechnicalsContext
  patterns?: AnalysisPatternsContext
  /** Phase K — multi-timeframe confluence (5m/1h/1d/1wk) */
  multiTimeframe?: AnalysisMultiTimeframeContext
  portfolioContext: {
    navUSD: number
    cashUSD: number
    dailyPnlUSD: number
    existingPosition?: { shares: number; avgCost: number; unrealizedPnl: number }
  }
}

const SYSTEM_PROMPT = `Eres TradingAgent, el motor de decisiones de ForgeOS, una plataforma de trading automatizado.

Tu trabajo es analizar datos de mercado en tiempo real y generar señales de trading precisas.

REGLAS ESTRICTAS:
- Solo recomiendas BUY si la confianza es >= 0.72 (>= 0.80 en premarket/aftermarket USA)
- Priorizas preservación de capital sobre ganancias
- Nunca recomiendas BUY si el activo no tiene liquidez (spread > 3%)
- Considera el contexto del portfolio: no concentres en un solo activo
- Si hay incertidumbre, HOLD es la respuesta correcta
- Da más peso a patrones con confianza > 80%
- Usa sentimiento de noticias como confirmación, no como señal única
- StockTwits bullish% alto confirma momentum alcista; bearish% alto confirma presión bajista
- Pico de menciones Reddit = señal de momentum/volatilidad — sé más conservador si no hay confirmación técnica
- Fear & Greed >75 (codicia extrema): más conservador en BUY, favorece toma de beneficios
- Fear & Greed <25 (miedo extremo): busca oportunidades de compra contraria si técnico confirma
- VIX >25: reduce confianza y tamaño implícito; prioriza preservación de capital
- Contexto inter-mercado: TLT bajando = risk off (presión growth); DXY fuerte = presión emergentes; yield 2s10s negativo = señal recesión
- En risk off sé más conservador con BUY en growth; usa sector fuerte/débil como confirmación relativa
- Usa niveles de soporte/resistencia y ATR para entry/SL/TP precisos
- Combina múltiples señales convergentes antes de recomendar BUY
- Sé más conservador si hay divergencias contradictorias (ej. RSI alcista vs MACD bajista)
- Sé más conservador en premarket/aftermarket: liquidez reducida, spreads amplios, mayor volatilidad
- Multi-timeframe: si Confluencia ≥3/4 TF → alta confianza; si solo 1 TF direccional → HOLD (no operar)
- Respeta entry/SL/TP adaptados al timeframe primario cuando se proporcionan

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "direction": "BUY" | "SELL" | "HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "explicación concisa en español (máx 150 chars)",
  "suggestedOrderType": "MKT" | "LMT",
  "suggestedLimitPrice": number | null,
  "urgency": "LOW" | "MEDIUM" | "HIGH"
}

No incluyas nada más. Sin markdown, sin texto adicional.`

export class TradingAgent {
  private apiKey: string

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY no configurada en .env.local')
    this.apiKey = key
  }

  async analyzeAndSignal(ctx: MarketContext): Promise<TradeSignal> {
    const userPrompt = this.buildPrompt(ctx)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: TRADING_CONFIG.ai.model,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text ?? ''

    let parsed: Omit<TradeSignal, 'ticker'>
    try {
      parsed = JSON.parse(rawText.trim())
    } catch {
      throw new Error(`TradingAgent: respuesta no parseable: ${rawText}`)
    }

    return {
      ticker: ctx.ticker,
      direction: parsed.direction,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      suggestedOrderType: parsed.suggestedOrderType,
      suggestedLimitPrice: parsed.suggestedLimitPrice ?? undefined,
      urgency: parsed.urgency,
    }
  }

  private buildPrompt(ctx: MarketContext): string {
    const pos = ctx.portfolioContext.existingPosition
    const spread = ((ctx.ask - ctx.bid) / ctx.currentPrice * 100).toFixed(2)
    const distFrom52wHigh = (((ctx.high52w - ctx.currentPrice) / ctx.high52w) * 100).toFixed(1)
    const distFrom52wLow = (((ctx.currentPrice - ctx.low52w) / ctx.low52w) * 100).toFixed(1)

    return `Analiza ${ctx.ticker} y genera una señal de trading.

DATOS DE MERCADO:
- Precio actual: $${ctx.currentPrice}
- Cambio 1d: ${ctx.change1d > 0 ? '+' : ''}${ctx.change1d.toFixed(2)}%
- Máx 52s: $${ctx.high52w} (${distFrom52wHigh}% bajo máx)
- Mín 52s: $${ctx.low52w} (+${distFrom52wLow}% sobre mín)
- Bid/Ask: $${ctx.bid} / $${ctx.ask} (spread ${spread}%)
- Volumen: ${ctx.volume.toLocaleString()}
${ctx.marketSession
  ? `- Exchange local: ${ctx.marketSession.exchange} (${ctx.marketSession.timeZone})
- Sesión local: ${ctx.marketSession.sessionLabel}
- Hora local exchange: ${ctx.marketSession.localTime}
- Mercado abierto ahora: ${ctx.marketSession.isOpenNow ? 'SÍ' : 'NO'}${ctx.marketSession.usPhase ? `\n- Fase USA: ${ctx.marketSession.usPhase}` : ''}`
  : '- Exchange local: SMART/USA (sesión global no requerida)'}
${ctx.usExtendedHours ? `
⚠️ CONTEXTO EXTENDED HOURS (PREMARKET/AFTERMARKET USA):
- Estamos en PREMARKET/AFTERMARKET — liquidez reducida, spreads más amplios, mayor volatilidad
- Umbral mínimo de confianza: 80% (vs 72% en mercado regular)
- Tamaño máximo de orden: 50% del normal
- Solo operar si volumen premarket/aftermarket > 100.000 acciones (actual: ${ctx.volume.toLocaleString()})` : ''}

CONTEXTO DEL PORTFOLIO:
- NAV total: $${ctx.portfolioContext.navUSD.toFixed(2)}
- Cash disponible: $${ctx.portfolioContext.cashUSD.toFixed(2)}
- P&L del día: ${ctx.portfolioContext.dailyPnlUSD >= 0 ? '+' : ''}$${ctx.portfolioContext.dailyPnlUSD.toFixed(2)}
${pos
  ? `- POSICIÓN EXISTENTE: ${pos.shares} acc a $${pos.avgCost.toFixed(2)} · P&L no realizado: ${pos.unrealizedPnl >= 0 ? '+' : ''}$${pos.unrealizedPnl.toFixed(2)}`
  : '- Sin posición existente en este ticker'}
${ctx.news ? `
NOTICIAS (24h, sentimiento ${ctx.news.overallSentiment}, ${ctx.news.newsCount24h} titulares):
${ctx.news.items.map((n) => `- [${n.source}] ${n.title} (${n.sentiment}, hace ${n.hoursAgo}h)`).join('\n') || '- Sin noticias recientes'}` : ''}
${ctx.sentiment ? `
SENTIMIENTO AVANZADO (score compuesto ${ctx.sentiment.compositeScore}/100):
${ctx.sentiment.stocktwits ? `- StockTwits: bullish ${ctx.sentiment.stocktwits.bullishPct ?? 'N/A'}% | bearish ${ctx.sentiment.stocktwits.bearishPct ?? 'N/A'}% | ${ctx.sentiment.stocktwits.messageCount24h} msg/24h${ctx.sentiment.stocktwits.trending ? ' | TRENDING' : ''}` : '- StockTwits: sin datos'}
${ctx.sentiment.reddit ? `- Reddit: ${ctx.sentiment.reddit.mentionCount24h} menciones/24h (WSB=${ctx.sentiment.reddit.wsbMentions}, r/stocks=${ctx.sentiment.reddit.stocksMentions}) | sentimiento ${ctx.sentiment.reddit.overallSentiment}${ctx.sentiment.reddit.mentionSpike ? ' | PICO MENCIONES' : ''}` : '- Reddit: sin menciones'}
- Macro: Fear&Greed=${ctx.sentiment.macro.fearGreedIndex ?? 'N/A'} (${ctx.sentiment.macro.fearGreedLabel ?? 'N/A'}) | VIX=${ctx.sentiment.macro.vix?.toFixed(1) ?? 'N/A'}${ctx.sentiment.macro.vixChangePct != null ? ` (${ctx.sentiment.macro.vixChangePct > 0 ? '+' : ''}${ctx.sentiment.macro.vixChangePct.toFixed(1)}%)` : ''}
${ctx.sentiment.macro.extremeGreed ? '⚠️ CODICIA EXTREMA — ser más conservador en nuevas compras' : ''}${ctx.sentiment.macro.extremeFear ? '💡 MIEDO EXTREMO — evaluar oportunidades contrarias si técnico confirma' : ''}${ctx.sentiment.macro.highVolatility ? '⚠️ VIX ELEVADO — reducir confianza' : ''}
- Señales: ${ctx.sentiment.signals.join('; ') || 'ninguna'}` : ''}
${ctx.macro ? `
${ctx.macro.formattedBlock}` : ''}
${ctx.technicals ? `
INDICADORES TÉCNICOS:
- Tendencia: EMA20=${ctx.technicals.trend.ema20?.toFixed(2) ?? 'N/A'} EMA50=${ctx.technicals.trend.ema50?.toFixed(2) ?? 'N/A'} EMA200=${ctx.technicals.trend.ema200?.toFixed(2) ?? 'N/A'} ADX=${ctx.technicals.trend.adx?.toFixed(1) ?? 'N/A'}
- MACD: ${ctx.technicals.trend.macd ? `hist=${ctx.technicals.trend.macd.histogram.toFixed(3)}` : 'N/A'}
- Ichimoku: ${ctx.technicals.trend.ichimoku ? (ctx.technicals.trend.ichimoku.aboveCloud ? 'sobre nube (alcista)' : 'bajo nube (bajista)') : 'N/A'}
- Momentum: RSI=${ctx.technicals.momentum.rsi?.toFixed(1) ?? 'N/A'} (${ctx.technicals.momentum.rsiZone}) CCI=${ctx.technicals.momentum.cci?.toFixed(1) ?? 'N/A'}
- Volatilidad: ATR=${ctx.technicals.volatility.atr?.toFixed(2) ?? 'N/A'} Squeeze=${ctx.technicals.volatility.squeeze?.active ? 'ACTIVO' : 'no'}
- Volumen: rel=${ctx.technicals.volume.relativeVolume?.toFixed(2) ?? 'N/A'}x VWAP=${ctx.technicals.volume.vwap?.toFixed(2) ?? 'N/A'}
- Soporte: ${ctx.technicals.levels.support.map((s) => `$${s.toFixed(2)}`).join(', ') || 'N/A'}
- Resistencia: ${ctx.technicals.levels.resistance.map((r) => `$${r.toFixed(2)}`).join(', ') || 'N/A'}` : ''}
${ctx.patterns ? `
PATRONES DETECTADOS:
- Velas: ${ctx.patterns.candlesticks.map((p) => `${p.name}(${p.type},${p.confidence}%)`).join(', ') || 'ninguno'}
- Precio: ${ctx.patterns.price.map((p) => `${p.name}(${p.type},${p.confidence}%)`).join(', ') || 'ninguno'}
- Divergencias: ${ctx.patterns.divergences.map((d) => `${d.indicator} ${d.type}(${d.confidence}%)`).join(', ') || 'ninguna'}
- Señales: ${ctx.patterns.signals.map((s) => `${s.name}: ${s.description}`).join('; ') || 'ninguna'}` : ''}
${ctx.multiTimeframe ? `
${ctx.multiTimeframe.formattedBlock}
${ctx.multiTimeframe.doNotTrade ? '⚠️ REGLA: señal débil multi-TF — responde HOLD' : ''}${ctx.multiTimeframe.highConfidence ? '✅ Alta confluencia multi-TF — puedes subir confianza' : ''}` : ''}

Genera la señal JSON ahora.`
  }
}
