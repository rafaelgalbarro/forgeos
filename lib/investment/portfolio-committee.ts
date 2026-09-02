import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { submitSupervisedLiveLimitOrder } from "@/lib/investment/ibkr-supervised-submit";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const COMMITTEE_MODEL = "claude-sonnet-4-6";
const MAX_PARALLEL_POSITIONS = 3;
const TOTAL_TIMEOUT_MS = 120_000;

type CommitteeDecision = "VENDER" | "MANTENER";
type CommitteeVote = {
  decision: CommitteeDecision;
  confidence: number;
  reason: string;
};

type CommitteeTickerResult = {
  symbol: string;
  pnl_pct: number;
  current_value: number;
  shares: number;
  entry_price: number;
  current_price: number;
  votes: Record<"ALPHA" | "MOMENTUM" | "SENTINEL" | "ORACLE", CommitteeVote>;
  governor: CommitteeVote & { action: string };
  capital_liberated: number;
};

export type CommitteeAnalysisResult = {
  analysisId: string;
  generatedAt: string;
  accountSummary: {
    totalPositions: number;
    sellCandidates: number;
    holdCandidates: number;
    capitalToLiberate: number;
  };
  positions: CommitteeTickerResult[];
};

type BrokerPosition = {
  symbol?: string;
  position?: number;
  avgCost?: number;
  unrealizedPnl?: number;
  account?: string;
};

const analysisMemory = new Map<string, CommitteeAnalysisResult>();

function clampConfidence(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function asDecision(v: unknown): CommitteeDecision {
  const s = String(v).toUpperCase();
  if (s.includes("VEN")) return "VENDER";
  return "MANTENER";
}

const JSON_REPLY_HINT =
  'Responde SOLO con este JSON exacto sin explicaciones largas: {"decision":"VENDER","confidence":0.85,"reason":"una frase corta"}';

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** PnL-based fallback when Claude JSON is truncated or invalid. */
function fallbackVoteFromPnl(pnlPct: number, agent: string): CommitteeVote {
  if (pnlPct < -85) {
    return {
      decision: "VENDER",
      confidence: 0.85,
      reason: `${agent}: fallback PnL ${pnlPct.toFixed(0)}% (JSON inválido)`,
    };
  }
  if (pnlPct > 20) {
    return {
      decision: "MANTENER",
      confidence: 0.8,
      reason: `${agent}: fallback PnL +${pnlPct.toFixed(0)}% (JSON inválido)`,
    };
  }
  return {
    decision: "MANTENER",
    confidence: 0.6,
    reason: `${agent}: EVALUAR — JSON inválido/truncado (PnL ${pnlPct.toFixed(0)}%)`,
  };
}

function voteFromParsed(parsed: Record<string, unknown> | null, pnlPct: number, agent: string): CommitteeVote {
  if (!parsed) return fallbackVoteFromPnl(pnlPct, agent);
  const decisionRaw = String(parsed.decision ?? "").toUpperCase();
  if (decisionRaw.includes("EVALUAR")) {
    return {
      decision: "MANTENER",
      confidence: clampConfidence(parsed.confidence ?? 0.6),
      reason: `EVALUAR: ${String(parsed.reason ?? "revisión manual").slice(0, 120)}`,
    };
  }
  return {
    decision: asDecision(parsed.decision),
    confidence: clampConfidence(parsed.confidence),
    reason: String(parsed.reason ?? "Sin razón").slice(0, 160),
  };
}

async function callCommitteeAgent(
  systemRole: string,
  userPrompt: string,
  pnlPct: number,
  agent: string,
): Promise<CommitteeVote> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    return { decision: "MANTENER", confidence: 0.5, reason: "ANTHROPIC_API_KEY no configurada" };
  }
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: COMMITTEE_MODEL,
        max_tokens: 500,
        temperature: 0.2,
        system: `${systemRole}. ${JSON_REPLY_HINT}`,
        messages: [{ role: "user", content: userPrompt }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.warn(`[Committee] ${agent} HTTP ${res.status}`);
      return fallbackVoteFromPnl(pnlPct, agent);
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text ?? "";
    const parsed = safeParseJson(text);
    if (!parsed) {
      console.warn(`[Committee] ${agent} JSON parse failed (len=${text.length})`);
    }
    return voteFromParsed(parsed, pnlPct, agent);
  } catch (err) {
    console.warn(`[Committee] ${agent} failed:`, err instanceof Error ? err.message : err);
    return fallbackVoteFromPnl(pnlPct, agent);
  }
}

async function fmpJson(path: string, query: Record<string, string>): Promise<unknown> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) return null;
  const url = new URL(`https://financialmodelingprep.com/stable${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", key);
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function analyzeOnePosition(pos: BrokerPosition): Promise<CommitteeTickerResult | null> {
  const symbol = String(pos.symbol ?? "").trim().toUpperCase();
  const shares = Math.abs(Number(pos.position ?? 0));
  const entry = Number(pos.avgCost ?? 0);
  if (!symbol || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(entry) || entry <= 0) return null;

  const [profileRaw, newsRaw] = await Promise.all([
    fmpJson("/profile", { symbol }),
    fmpJson("/news/stock", { symbols: symbol, limit: "5" }),
  ]);
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : null;
  const currentPrice = Number((profile as { price?: unknown })?.price ?? 0);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
  const pnlPct = ((currentPrice - entry) / entry) * 100;
  const currentValue = currentPrice * shares;
  const changePct = Number(
    (profile as { changesPercentage?: number; changePercentage?: number })?.changesPercentage ??
      (profile as { changePercentage?: number })?.changePercentage ??
      0,
  );
  const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 5) : [];
  const newsHeadlines = news
    .map((n) => String((n as { title?: string }).title ?? "").slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);

  const alphaPrompt = `Analiza ${symbol} PnL=${pnlPct.toFixed(1)}%. ${JSON_REPLY_HINT}`;
  const momentumPrompt = `Tendencia ${symbol}. Cambio día ${changePct.toFixed(2)}% (screener, sin histórico). ${JSON_REPLY_HINT}`;
  const sentinelPrompt = `Riesgo ${symbol}: PnL ${pnlPct.toFixed(1)}%, valor $${currentValue.toFixed(2)}. ${JSON_REPLY_HINT}`;
  const oraclePrompt = `Noticias ${symbol}: ${newsHeadlines.join(" | ") || "sin noticias"}. ${JSON_REPLY_HINT}`;

  const [ALPHA, MOMENTUM, SENTINEL, ORACLE] = await Promise.all([
    callCommitteeAgent("Analista fundamental", alphaPrompt, pnlPct, "ALPHA"),
    callCommitteeAgent("Trader técnico", momentumPrompt, pnlPct, "MOMENTUM"),
    callCommitteeAgent("Gestor de riesgo", sentinelPrompt, pnlPct, "SENTINEL"),
    callCommitteeAgent("Analista de sentimiento", oraclePrompt, pnlPct, "ORACLE"),
  ]);

  const votes = { ALPHA, MOMENTUM, SENTINEL, ORACLE };
  const governorPrompt = `Votos sobre ${symbol} (PnL ${pnlPct.toFixed(1)}%): ${JSON.stringify(votes)}. ${JSON_REPLY_HINT}`;
  const gov = await callCommitteeAgent("Árbitro final de comité", governorPrompt, pnlPct, "GOVERNOR");
  const governor = {
    ...gov,
    action:
      gov.decision === "VENDER"
        ? `SELL ${Math.max(1, Math.floor(shares))} ${symbol} @ market`
        : `HOLD ${symbol}`,
  };

  return {
    symbol,
    pnl_pct: Number(pnlPct.toFixed(2)),
    current_value: Number(currentValue.toFixed(2)),
    shares,
    entry_price: entry,
    current_price: currentPrice,
    votes,
    governor,
    capital_liberated: governor.decision === "VENDER" ? Number(currentValue.toFixed(2)) : 0,
  };
}

async function mapWithConcurrency<T, R>(
  arr: readonly T[],
  limit: number,
  fn: (x: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < arr.length) {
      const i = idx++;
      out[i] = await fn(arr[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, limit) }, () => worker()));
  return out;
}

function buildTelegramReport(result: CommitteeAnalysisResult): string {
  const sell = result.positions.filter((p) => p.governor.decision === "VENDER");
  const hold = result.positions.filter((p) => p.governor.decision === "MANTENER");
  const strongSell = sell.filter((p) => p.governor.confidence >= 0.8);
  const lines = [
    "🧠 <b>FORGEOS AI COMMITTEE — ANÁLISIS DE PORTFOLIO</b>",
    "",
    "⚖️ <b>VEREDICTO POR POSICIÓN</b>",
    "",
    "🔴 <b>VENDER (consenso alto)</b>",
    ...strongSell.slice(0, 12).map((p) => `- ${p.symbol} | Conf ${(p.governor.confidence * 100).toFixed(0)}% | Libera $${p.capital_liberated.toFixed(0)} | "${p.governor.reason}"`),
    "",
    "🟢 <b>MANTENER</b>",
    ...hold.slice(0, 12).map((p) => `- ${p.symbol} | Conf ${(p.governor.confidence * 100).toFixed(0)}% | "${p.governor.reason}"`),
    "",
    `💰 Capital estimado a liberar: $${result.accountSummary.capitalToLiberate.toFixed(2)} USD`,
    "⏳ Expira en 15 min",
  ];
  return lines.join("\n");
}

export function getCommitteeAnalysis(analysisId: string): CommitteeAnalysisResult | null {
  return analysisMemory.get(analysisId) ?? null;
}

export async function runPortfolioCommitteeAnalysis(options?: {
  autoExecute?: boolean;
}): Promise<CommitteeAnalysisResult> {
  const run = async (): Promise<CommitteeAnalysisResult> => {
    const rows = await ibkrServiceFetch<BrokerPosition[]>("/api/ibkr/positions");
    const positions = rows.filter((p) => Math.abs(Number(p.position ?? 0)) > 0);
    const analyzed = await mapWithConcurrency(positions, MAX_PARALLEL_POSITIONS, analyzeOnePosition);
    const clean = analyzed.filter((x): x is CommitteeTickerResult => x != null);
    const sell = clean.filter((p) => p.governor.decision === "VENDER");
    const capital = sell.reduce((s, p) => s + p.capital_liberated, 0);
    const result: CommitteeAnalysisResult = {
      analysisId: `committee_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      accountSummary: {
        totalPositions: clean.length,
        sellCandidates: sell.length,
        holdCandidates: clean.length - sell.length,
        capitalToLiberate: Number(capital.toFixed(2)),
      },
      positions: clean.sort((a, b) => a.symbol.localeCompare(b.symbol)),
    };
    analysisMemory.set(result.analysisId, result);
    if (options?.autoExecute) {
      const exec = await executeCommitteeSales(result.analysisId, { minConfidence: 0.7 });
      console.log(
        `[Committee] auto-ejecución 09:00: sold=${exec.sold} freed=$${exec.capitalFreed.toFixed(2)}`,
      );
      return result;
    }
    const report = buildTelegramReport(result);
    await sendTelegramMessage(report, [
      [
        { text: "✅ EJECUTAR VENTAS AUTOMÁTICAS", callback_data: `committee_execute:${result.analysisId}` },
        { text: "📋 VER ANÁLISIS COMPLETO", callback_data: `committee_view:${result.analysisId}` },
        { text: "❌ CANCELAR", callback_data: `committee_cancel:${result.analysisId}` },
      ],
    ]);
    return result;
  };
  return Promise.race([
    run(),
    new Promise<CommitteeAnalysisResult>((_, reject) =>
      setTimeout(() => reject(new Error("Committee timeout (120s)")), TOTAL_TIMEOUT_MS),
    ),
  ]);
}

export async function executeCommitteeSales(
  analysisId: string,
  options?: { minConfidence?: number },
): Promise<{
  sold: number;
  capitalFreed: number;
  details: Array<{ symbol: string; ok: boolean; orderId?: string; error?: string }>;
}> {
  const snapshot = analysisMemory.get(analysisId);
  if (!snapshot) throw new Error(`analysisId no encontrado: ${analysisId}`);
  const minConf = options?.minConfidence ?? 0.7;
  const toSell = snapshot.positions.filter(
    (p) => p.governor.decision === "VENDER" && p.governor.confidence > minConf,
  );
  const details: Array<{ symbol: string; ok: boolean; orderId?: string; error?: string }> = [];
  let sold = 0;
  let capitalFreed = 0;
  for (const pos of toSell) {
    try {
      const order = await submitSupervisedLiveLimitOrder({
        symbol: pos.symbol,
        side: "SELL",
        quantity: Math.max(1, Math.floor(pos.shares)),
        limitPrice: pos.current_price,
        rationale: `Committee auto-sell ${analysisId}: ${pos.governor.reason}`.slice(0, 4000),
        outsideRth: isIbkrCryptoTicker(pos.symbol) ? true : false,
        account: process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
      });
      sold += 1;
      capitalFreed += pos.current_value;
      details.push({ symbol: pos.symbol, ok: true, orderId: order.ibkrOrderId });
    } catch (err) {
      details.push({ symbol: pos.symbol, ok: false, error: err instanceof Error ? err.message : "sell failed" });
    }
  }
  console.log(`[Committee] execute sales: sold=${sold} freed=$${capitalFreed.toFixed(2)}`);
  return { sold, capitalFreed: Number(capitalFreed.toFixed(2)), details };
}
