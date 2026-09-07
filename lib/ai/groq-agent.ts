import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import type { MarketContext, TradeSignal } from "@/src/core/trading/ai/trading-agent";
import {
  buildTradingUserPrompt,
  GROQ_QUICK_SCORE_PROMPT,
  parseJsonFromModelText,
  TRADING_AGENT_SYSTEM_PROMPT,
} from "@/lib/ai/trading-prompt";

export type GroqQuickScore = {
  ticker: string;
  score: number;
  direction: "BUY" | "SELL" | "HOLD";
  reasoning: string;
  patternName?: string;
};

export type QuickScoreInput = {
  ticker: string;
  price: number;
  changePct: number;
  rsi: number | null;
  relativeVolume: number | null;
  patternHint?: string;
  newsSentiment?: string;
};

/** Groq Llama agent — misma interfaz que TradingAgent (intercambiable). */
export class GroqAgent {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) throw new Error("GROQ_API_KEY no configurada en .env.local");
    this.apiKey = key;
    this.model =
      TRADING_CONFIG.aiProviders?.groq?.model ??
      process.env.GROQ_MODEL ??
      "llama-3.3-70b-versatile";
  }

  async analyzeAndSignal(ctx: MarketContext): Promise<TradeSignal> {
    const parsed = await this.chatJson(TRADING_AGENT_SYSTEM_PROMPT, buildTradingUserPrompt(ctx));
    return {
      ticker: ctx.ticker,
      direction: parsed.direction as TradeSignal["direction"],
      confidence: Number(parsed.confidence),
      reasoning: String(parsed.reasoning ?? ""),
      suggestedOrderType: (parsed.suggestedOrderType as TradeSignal["suggestedOrderType"]) ?? "LMT",
      suggestedLimitPrice:
        parsed.suggestedLimitPrice != null ? Number(parsed.suggestedLimitPrice) : undefined,
      urgency: (parsed.urgency as TradeSignal["urgency"]) ?? "MEDIUM",
    };
  }

  /** Fase 2 — scoring rápido 0-100. */
  async scoreCandidate(input: QuickScoreInput): Promise<GroqQuickScore> {
    const user = [
      `Ticker: ${input.ticker}`,
      `Precio: $${input.price.toFixed(2)} | Cambio 1d: ${input.changePct.toFixed(2)}%`,
      `RSI: ${input.rsi?.toFixed(1) ?? "N/A"} | Vol rel: ${input.relativeVolume?.toFixed(2) ?? "N/A"}x`,
      `Patrón: ${input.patternHint ?? "—"} | News: ${input.newsSentiment ?? "NEUTRAL"}`,
      "Puntúa oportunidad 0-100.",
    ].join("\n");

    const parsed = await this.chatJson(GROQ_QUICK_SCORE_PROMPT, user);
    return {
      ticker: input.ticker,
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      direction: (parsed.direction as GroqQuickScore["direction"]) ?? "HOLD",
      reasoning: String(parsed.reasoning ?? ""),
      patternName: parsed.patternName != null ? String(parsed.patternName) : undefined,
    };
  }

  private async chatJson(system: string, user: string): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const rawText = data.choices?.[0]?.message?.content ?? "";
    try {
      return parseJsonFromModelText(rawText);
    } catch {
      throw new Error(`GroqAgent: respuesta no parseable: ${rawText}`);
    }
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

/** Rate-limited concurrent runner for Groq batch scoring. */
export async function runGroqConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx;
      idx += 1;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
