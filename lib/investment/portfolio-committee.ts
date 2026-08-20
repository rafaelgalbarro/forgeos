import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { submitSupervisedLiveLimitOrder } from "@/lib/investment/ibkr-supervised-submit";
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
  return String(v).toUpperCase().includes("VEN") ? "VENDER" : "MANTENER";
}

/** Strip markdown fences (```json ... ```) before JSON.parse — all committee agents. */
function parseCommitteeJson(response: string): Record<string, unknown> {
  const cleanJson = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleanJson) as Record<string, unknown>;
}

async function callCommitteeAgent(systemRole: string, userPrompt: string): Promise<CommitteeVote> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    return { decision: "MANTENER", confidence: 0.5, reason: "ANTHROPIC_API_KEY no configurada" };
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: COMMITTEE_MODEL,
      max_tokens: 350,
      temperature: 0.2,
      system: systemRole,
      messages: [{ role: "user", content: userPrompt }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const parsed = parseCommitteeJson(data.content?.[0]?.text ?? "{}");
  return {
    decision: asDecision(parsed.decision),
    confidence: clampConfidence(parsed.confidence),
    reason: String(parsed.reason ?? "Sin razón"),
  };
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

  const [profileRaw, histRaw, newsRaw] = await Promise.all([
    fmpJson("/profile", { symbol }),
    fmpJson("/historical-price-eod/full", { symbol }),
    fmpJson("/news/stock", { symbols: symbol, limit: "5" }),
  ]);
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : null;
  const currentPrice = Number((profile as { price?: unknown })?.price ?? 0);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
  const pnlPct = ((currentPrice - entry) / entry) * 100;
  const currentValue = currentPrice * shares;
  const histRows = Array.isArray(histRaw)
    ? histRaw
    : Array.isArray((histRaw as { historical?: unknown })?.historical)
      ? ((histRaw as { historical: unknown[] }).historical ?? [])
      : [];
  const hist30 = histRows.slice(0, 30);
  const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 5) : [];

  const alphaPrompt = `Eres un analista fundamental experto. Analiza ${symbol} con PnL=${pnlPct.toFixed(1)}%. Considera fundamentales, sector y perspectivas de recuperación. Responde SOLO JSON: {"decision":"VENDER|MANTENER","confidence":0-1,"reason":string}`;
  const momentumPrompt = `Eres un trader técnico experto. Analiza la tendencia de ${symbol} con estos datos históricos: ${JSON.stringify(hist30)}. Responde SOLO JSON: {"decision":"VENDER|MANTENER","confidence":0-1,"reason":string}`;
  const sentinelPrompt = `Eres un gestor de riesgo. Evalúa si mantener ${symbol} con pérdida ${pnlPct.toFixed(1)}% y valor actual $${currentValue.toFixed(2)} tiene sentido desde el punto de vista del riesgo. Responde SOLO JSON: {"decision":"VENDER|MANTENER","confidence":0-1,"reason":string}`;
  const oraclePrompt = `Eres analista de sentimiento. Basándote en estas noticias recientes de ${symbol}: ${JSON.stringify(news)}. ¿Hay catalizadores que justifiquen mantener? Responde SOLO JSON: {"decision":"VENDER|MANTENER","confidence":0-1,"reason":string}`;

  const [ALPHA, MOMENTUM, SENTINEL, ORACLE] = await Promise.all([
    callCommitteeAgent("Analista fundamental", alphaPrompt),
    callCommitteeAgent("Trader técnico", momentumPrompt),
    callCommitteeAgent("Gestor de riesgo", sentinelPrompt),
    callCommitteeAgent("Analista de noticias/sentimiento", oraclePrompt),
  ]);

  const votes = { ALPHA, MOMENTUM, SENTINEL, ORACLE };
  const governorPrompt = `Eres el árbitro final de un comité de inversión. Estos son los votos de tus 4 analistas sobre ${symbol}: ${JSON.stringify(votes)}. Toma la decisión final considerando todos los argumentos. Responde SOLO JSON: {"decision":"VENDER|MANTENER","confidence":0-1,"reason":string,"action":string}`;
  const gov = await callCommitteeAgent("Árbitro final de comité", governorPrompt);
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

export async function runPortfolioCommitteeAnalysis(): Promise<CommitteeAnalysisResult> {
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

export async function executeCommitteeSales(analysisId: string): Promise<{
  sold: number;
  capitalFreed: number;
  details: Array<{ symbol: string; ok: boolean; orderId?: string; error?: string }>;
}> {
  const snapshot = analysisMemory.get(analysisId);
  if (!snapshot) throw new Error(`analysisId no encontrado: ${analysisId}`);
  const toSell = snapshot.positions.filter((p) => p.governor.decision === "VENDER" && p.governor.confidence > 0.8);
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
        outsideRth: false,
        account: process.env.IBKR_ACCOUNT_ID?.trim() || undefined,
      });
      sold += 1;
      capitalFreed += pos.current_value;
      details.push({ symbol: pos.symbol, ok: true, orderId: order.ibkrOrderId });
    } catch (err) {
      details.push({ symbol: pos.symbol, ok: false, error: err instanceof Error ? err.message : "sell failed" });
    }
  }
  await sendTelegramMessage(`✅ Vendidas ${sold} posiciones | Capital liberado: $${capitalFreed.toFixed(2)}`);
  return { sold, capitalFreed: Number(capitalFreed.toFixed(2)), details };
}
