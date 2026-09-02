/**
 * Shared trading prompt builder for Claude / Groq agents.
 */
import type { MarketContext } from "@/src/core/trading/ai/trading-agent";

export const TRADING_AGENT_SYSTEM_PROMPT = `Eres TradingAgent, el motor de decisiones de ForgeOS, una plataforma de trading automatizado.

Tu trabajo es analizar datos de mercado en tiempo real y generar señales de trading precisas.

REGLAS ESTRICTAS:
- Solo recomiendas BUY si la confianza es >= 0.50 (>= 0.60 en premarket/aftermarket USA)
- Priorizas preservación de capital sobre ganancias
- Nunca recomiendas BUY si el activo no tiene liquidez (spread > 3%)
- Considera el contexto del portfolio: no concentres en un solo activo
- Si hay incertidumbre, HOLD es la respuesta correcta
- Da más peso a patrones con confianza > 80%
- Usa sentimiento de noticias como confirmación, no como señal única
- StockTwits bullish% alto confirma momentum; Reddit pico menciones = volatilidad
- Fear & Greed >75: más conservador | <25: oportunidades contrarias si técnico confirma
- VIX >25: reduce confianza
- Inter-mercado: TLT↓=risk off; DXY↑=presión emergentes; yield 2s10s<0=recesión — más conservador en BUY si risk off
- Sé más conservador en premarket/aftermarket
- Multi-timeframe: ≥3/4 TF alineados = alta confianza; 1 solo TF direccional = HOLD (no operar)

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "direction": "BUY" | "SELL" | "HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "explicación concisa en español (máx 150 chars)",
  "suggestedOrderType": "MKT" | "LMT",
  "suggestedLimitPrice": number | null,
  "urgency": "LOW" | "MEDIUM" | "HIGH"
}

No incluyas nada más. Sin markdown, sin texto adicional.`;

export const GROQ_QUICK_SCORE_PROMPT = `Eres un scanner de mercado rápido. Analiza el candidato y puntúa oportunidad de trading 0-100.

Responde SOLO JSON:
{
  "score": 0-100,
  "direction": "BUY" | "SELL" | "HOLD",
  "reasoning": "máx 120 chars español",
  "patternName": "patrón principal o null"
}`;

export function buildTradingUserPrompt(ctx: MarketContext): string {
  const pos = ctx.portfolioContext.existingPosition;
  const spread = ((ctx.ask - ctx.bid) / ctx.currentPrice * 100).toFixed(2);
  const distFrom52wHigh = (((ctx.high52w - ctx.currentPrice) / ctx.high52w) * 100).toFixed(1);
  const distFrom52wLow = (((ctx.currentPrice - ctx.low52w) / ctx.low52w) * 100).toFixed(1);

  return `Analiza ${ctx.ticker} y genera una señal de trading.

DATOS DE MERCADO:
- Precio actual: $${ctx.currentPrice}
- Cambio 1d: ${ctx.change1d > 0 ? "+" : ""}${ctx.change1d.toFixed(2)}%
- Máx 52s: $${ctx.high52w} (${distFrom52wHigh}% bajo máx)
- Mín 52s: $${ctx.low52w} (+${distFrom52wLow}% sobre mín)
- Bid/Ask: $${ctx.bid} / $${ctx.ask} (spread ${spread}%)
- Volumen: ${ctx.volume.toLocaleString()}
${ctx.marketSession
  ? `- Sesión: ${ctx.marketSession.sessionLabel} (${ctx.marketSession.isOpenNow ? "ABIERTO" : "CERRADO"})`
  : ""}
${ctx.usExtendedHours ? "⚠️ EXTENDED HOURS — mayor volatilidad, spreads amplios" : ""}

CONTEXTO PORTFOLIO:
- NAV: $${ctx.portfolioContext.navUSD.toFixed(2)} | Cash: $${ctx.portfolioContext.cashUSD.toFixed(2)}
${pos ? `- Posición: ${pos.shares} @ $${pos.avgCost.toFixed(2)}` : "- Sin posición"}
${ctx.news ? `
NOTICIAS (${ctx.news.overallSentiment}, ${ctx.news.newsCount24h} titulares):
${ctx.news.items.slice(0, 5).map((n) => `- [${n.source}] ${n.title} (${n.sentiment})`).join("\n")}` : ""}
${ctx.sentiment ? `
SENTIMIENTO: score=${ctx.sentiment.compositeScore}${ctx.sentiment.stocktwits ? ` | ST bullish=${ctx.sentiment.stocktwits.bullishPct ?? "N/A"}% msg=${ctx.sentiment.stocktwits.messageCount24h}` : ""}${ctx.sentiment.reddit?.mentionSpike ? " | Reddit SPIKE" : ""} | F&G=${ctx.sentiment.macro.fearGreedIndex ?? "N/A"} VIX=${ctx.sentiment.macro.vix?.toFixed(1) ?? "N/A"}
${ctx.sentiment.macro.extremeGreed ? "⚠️ Codicia extrema" : ""}${ctx.sentiment.macro.extremeFear ? " 💡 Miedo extremo" : ""}` : ""}
${ctx.macro ? `
${ctx.macro.formattedBlock}` : ""}
${ctx.technicals ? `
TÉCNICOS: RSI=${ctx.technicals.momentum.rsi?.toFixed(1) ?? "N/A"} EMA20=${ctx.technicals.trend.ema20?.toFixed(2) ?? "N/A"} ATR=${ctx.technicals.volatility.atr?.toFixed(2) ?? "N/A"} relVol=${ctx.technicals.volume.relativeVolume?.toFixed(2) ?? "N/A"}x` : ""}
${ctx.patterns ? `
PATRONES: ${[...ctx.patterns.candlesticks, ...ctx.patterns.price].slice(0, 4).map((p) => p.name).join(", ") || "ninguno"}` : ""}
${ctx.multiTimeframe ? `
${ctx.multiTimeframe.formattedBlock}
${ctx.multiTimeframe.doNotTrade ? "⚠️ Señal débil multi-TF — HOLD" : ""}${ctx.multiTimeframe.highConfidence ? "✅ Alta confluencia multi-TF" : ""}` : ""}

Genera la señal JSON ahora.`;
}

export function parseJsonFromModelText(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(body) as Record<string, unknown>;
}
