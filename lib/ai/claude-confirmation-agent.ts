import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import type { MarketContext, TradeSignal } from "@/src/core/trading/ai/trading-agent";
import { buildTradingUserPrompt, parseJsonFromModelText, TRADING_AGENT_SYSTEM_PROMPT } from "@/lib/ai/trading-prompt";
import { GroqAgent, isGroqConfigured } from "@/lib/ai/groq-agent";

/** Claude Haiku — confirmación final (Fase 3). Fallback a Groq si falla. */
export class ClaudeConfirmationAgent {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) throw new Error("ANTHROPIC_API_KEY no configurada");
    this.apiKey = key;
    this.model = TRADING_CONFIG.aiProviders?.claude?.model ?? "claude-haiku-4-5";
  }

  async confirmSignal(ctx: MarketContext): Promise<TradeSignal> {
    try {
      return await this.analyzeWithClaude(ctx);
    } catch (err) {
      console.warn(
        "[ClaudeConfirmation] fallback Groq:",
        err instanceof Error ? err.message : err,
      );
      if (!isGroqConfigured()) throw err;
      return new GroqAgent().analyzeAndSignal(ctx);
    }
  }

  private async analyzeWithClaude(ctx: MarketContext): Promise<TradeSignal> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 512,
        system: TRADING_AGENT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildTradingUserPrompt(ctx) }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const rawText = data.content?.[0]?.text ?? "";
    const parsed = parseJsonFromModelText(rawText);

    return {
      ticker: ctx.ticker,
      direction: parsed.direction as TradeSignal["direction"],
      confidence: Number(parsed.confidence),
      reasoning: String(parsed.reasoning ?? ""),
      suggestedOrderType: (parsed.suggestedOrderType as TradeSignal["suggestedOrderType"]) ?? "LMT",
      suggestedLimitPrice:
        parsed.suggestedLimitPrice != null ? Number(parsed.suggestedLimitPrice) : ctx.currentPrice,
      urgency: (parsed.urgency as TradeSignal["urgency"]) ?? "MEDIUM",
    };
  }
}

export function isClaudeConfirmationConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
