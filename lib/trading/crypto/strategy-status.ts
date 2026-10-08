/**
 * .forgeos/journal/crypto-strategy-status.json — live/shadow + reason (hand-editable).
 * Auto-degrade / auto-promote without requiring prior promotion gate.
 */

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import {
  ALL_CRYPTO_STRATEGY_IDS,
  type CryptoStrategyId,
} from "@/lib/trading/crypto/strategies/types";
import type { CryptoJournalTrade } from "@/lib/trading/crypto/journal-crypto";

export type StrategyMode = "live" | "shadow";

export type StrategyStatusEntry = {
  mode: StrategyMode;
  reason: string;
  updatedAt: string;
  /** Manual lock — auto-tune will not flip mode. */
  manual?: boolean;
};

export type StrategyStatusFile = {
  deployAt: string;
  updatedAt: string;
  strategies: Record<string, StrategyStatusEntry>;
};

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function filePath(): string {
  return path.join(forgeosRoot(), ".forgeos", "journal", "crypto-strategy-status.json");
}

function defaultFile(): StrategyStatusFile {
  const now = new Date().toISOString();
  const strategies: Record<string, StrategyStatusEntry> = {};
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    strategies[id] = {
      mode: "live",
      reason: "default_live",
      updatedAt: now,
    };
  }
  return { deployAt: now, updatedAt: now, strategies };
}

export function loadStrategyStatus(): StrategyStatusFile {
  try {
    const p = filePath();
    if (!fs.existsSync(p)) {
      const d = defaultFile();
      saveStrategyStatus(d);
      return d;
    }
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as StrategyStatusFile;
    if (!raw?.strategies) return defaultFile();
    // Ensure all ids present
    let changed = false;
    for (const id of ALL_CRYPTO_STRATEGY_IDS) {
      if (!raw.strategies[id]) {
        raw.strategies[id] = {
          mode: "live",
          reason: "seeded",
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      }
    }
    if (!raw.deployAt) {
      raw.deployAt = new Date().toISOString();
      changed = true;
    }
    if (changed) saveStrategyStatus(raw);
    return raw;
  } catch {
    return defaultFile();
  }
}

export function saveStrategyStatus(file: StrategyStatusFile): void {
  try {
    const p = filePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    file.updatedAt = new Date().toISOString();
    fs.writeFileSync(p, JSON.stringify(file, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[CryptoStatus] save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function getDeployAtMs(): number {
  const f = loadStrategyStatus();
  const t = Date.parse(f.deployAt);
  return Number.isFinite(t) ? t : Date.now();
}

export function getStrategyMode(strategyId: string): StrategyMode {
  const e = loadStrategyStatus().strategies[strategyId];
  return e?.mode === "shadow" ? "shadow" : "live";
}

export async function setStrategyMode(params: {
  strategyId: string;
  mode: StrategyMode;
  reason: string;
  manual?: boolean;
  notify?: boolean;
}): Promise<boolean> {
  const file = loadStrategyStatus();
  const prev = file.strategies[params.strategyId];
  if (prev?.manual && !params.manual) {
    return false; // respect hand edit
  }
  if (prev?.mode === params.mode && prev.reason === params.reason) return false;
  file.strategies[params.strategyId] = {
    mode: params.mode,
    reason: params.reason,
    updatedAt: new Date().toISOString(),
    manual: params.manual ?? prev?.manual,
  };
  saveStrategyStatus(file);
  if (params.notify !== false) {
    const emoji = params.mode === "shadow" ? "🌑" : "☀️";
    await sendTelegramMessage(
      `${emoji} <b>${params.strategyId}</b> → <b>${params.mode}</b>\n${params.reason}`,
    ).catch(() => undefined);
  }
  return true;
}

type Closed = {
  strategy: string;
  shadow: boolean;
  netPnlEur: number;
  netPct: number;
  at: number;
};

function closedTrades(trades: readonly CryptoJournalTrade[]): Closed[] {
  const out: Closed[] = [];
  for (const t of trades) {
    if (t.side !== "SELL" || t.netPnlEur == null) continue;
    const at = Date.parse(t.at);
    const entry = t.entry > 0 ? t.entry : 1;
    // Approximate % from net if notional unknown — use net/entry as weak proxy; prefer stored
    const netPct =
      (t as { netPct?: number }).netPct != null
        ? Number((t as { netPct?: number }).netPct)
        : t.netPnlEur / Math.max(1, entry * 0.01); // fallback rough
    out.push({
      strategy: String(t.strategy),
      shadow: Boolean(t.shadow),
      netPnlEur: t.netPnlEur,
      netPct: Number.isFinite(netPct) ? netPct : 0,
      at: Number.isFinite(at) ? at : 0,
    });
  }
  return out;
}

/**
 * Degrade to shadow:
 * - 5 live trades with mean net < 0
 * - lose > 2% of Kraken capital in 7 days
 * - nightly backtest PF < 0.9 (caller passes via reason)
 *
 * Promote to live from shadow:
 * - ≥15 shadow trades, mean net > +0.3%, PF > 1.3
 */
export async function autoDegradePromoteStrategies(params: {
  trades: readonly CryptoJournalTrade[];
  capitalEur: number;
  backtestPfByStrategy?: Partial<Record<string, number>>;
}): Promise<string[]> {
  const msgs: string[] = [];
  const closed = closedTrades(params.trades);
  const capital = Math.max(1, params.capitalEur);
  const weekAgo = Date.now() - 7 * 24 * 3600_000;

  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    const live = closed.filter((c) => c.strategy === id && !c.shadow);
    const shadow = closed.filter((c) => c.strategy === id && c.shadow);
    const mode = getStrategyMode(id);

    // 7d capital loss
    const weekLive = live.filter((c) => c.at >= weekAgo);
    const weekLoss = weekLive.reduce((s, c) => s + Math.min(0, c.netPnlEur), 0);
    if (mode === "live" && Math.abs(weekLoss) / capital > 0.02 && weekLoss < 0) {
      const ok = await setStrategyMode({
        strategyId: id,
        mode: "shadow",
        reason: `pérdida 7d €${weekLoss.toFixed(2)} > 2% capital (€${capital.toFixed(0)})`,
      });
      if (ok) msgs.push(`${id} → shadow (7d loss)`);
      continue;
    }

    // 5 live with mean negative
    if (mode === "live" && live.length >= 5) {
      const last5 = live.slice(-5);
      const mean = last5.reduce((s, c) => s + c.netPnlEur, 0) / last5.length;
      if (mean < 0) {
        const ok = await setStrategyMode({
          strategyId: id,
          mode: "shadow",
          reason: `5 ops live mean net €${mean.toFixed(3)} < 0`,
        });
        if (ok) msgs.push(`${id} → shadow (5 losing)`);
        continue;
      }
    }

    // Backtest PF
    const pf = params.backtestPfByStrategy?.[id];
    if (mode === "live" && pf != null && pf < 0.9) {
      const ok = await setStrategyMode({
        strategyId: id,
        mode: "shadow",
        reason: `backtest PF=${pf.toFixed(2)} < 0.9`,
      });
      if (ok) msgs.push(`${id} → shadow (backtest PF)`);
      continue;
    }

    // Promote from shadow
    if (mode === "shadow" && shadow.length >= 15) {
      const meanPct =
        shadow.reduce((s, c) => s + c.netPct, 0) / shadow.length;
      const wins = shadow.filter((c) => c.netPnlEur > 0).reduce((s, c) => s + c.netPnlEur, 0);
      const losses = shadow
        .filter((c) => c.netPnlEur < 0)
        .reduce((s, c) => s + Math.abs(c.netPnlEur), 0);
      const profitFactor = losses > 0 ? wins / losses : wins > 0 ? 99 : 0;
      if (meanPct > 0.3 && profitFactor > 1.3) {
        const ok = await setStrategyMode({
          strategyId: id,
          mode: "live",
          reason: `shadow n=${shadow.length} meanPct=${meanPct.toFixed(2)}% PF=${profitFactor.toFixed(2)}`,
        });
        if (ok) msgs.push(`${id} → live (shadow promote)`);
      }
    }
  }
  return msgs;
}

/** Apply backtest PF degradation after nightly run. */
export async function applyBacktestDegradation(
  pfByStrategy: Partial<Record<CryptoStrategyId, number>>,
): Promise<string[]> {
  const msgs: string[] = [];
  for (const [id, pf] of Object.entries(pfByStrategy)) {
    if (pf == null || pf >= 0.9) continue;
    if (getStrategyMode(id) !== "live") continue;
    const ok = await setStrategyMode({
      strategyId: id,
      mode: "shadow",
      reason: `backtest nocturno PF=${pf.toFixed(2)} < 0.9`,
    });
    if (ok) msgs.push(`${id} → shadow (PF ${pf.toFixed(2)})`);
  }
  return msgs;
}
