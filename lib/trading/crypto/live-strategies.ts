/**
 * CRYPTO_LIVE_STRATEGIES — comma list in .env.local, re-read every cycle (no restart).
 * Default: all 12 strategies live. Anything not listed → shadow.
 */

import fs from "node:fs";
import path from "node:path";
import {
  ALL_CRYPTO_STRATEGY_IDS,
  type CryptoStrategyId,
} from "@/lib/trading/crypto/strategies/types";
import {
  getDeployAtMs,
  getStrategyMode,
  type StrategyMode,
} from "@/lib/trading/crypto/strategy-status";

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

/** Fresh read of one key from .env.local. */
export function readCryptoEnvLocal(key: string): string | undefined {
  try {
    const p = path.join(forgeosRoot(), ".env.local");
    if (!fs.existsSync(p)) return undefined;
    const text = fs.readFileSync(p, "utf8");
    const re = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m");
    const m = text.match(re);
    if (!m) return undefined;
    let v = (m[1] ?? "").trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    const hash = v.indexOf(" #");
    if (hash >= 0) v = v.slice(0, hash).trim();
    return v;
  } catch {
    return undefined;
  }
}

const ID_SET = new Set<string>(ALL_CRYPTO_STRATEGY_IDS);

/**
 * Strategies allowed to trade live (before status-file degradation).
 * Empty / missing env → all 12.
 */
export function parseCryptoLiveStrategiesList(): Set<CryptoStrategyId> {
  const raw =
    readCryptoEnvLocal("CRYPTO_LIVE_STRATEGIES") ??
    process.env.CRYPTO_LIVE_STRATEGIES ??
    "";
  if (!raw.trim()) {
    return new Set(ALL_CRYPTO_STRATEGY_IDS);
  }
  const out = new Set<CryptoStrategyId>();
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (ID_SET.has(id)) out.add(id as CryptoStrategyId);
  }
  return out.size > 0 ? out : new Set(ALL_CRYPTO_STRATEGY_IDS);
}

/**
 * Effective mode: env list ∩ status file.
 * live only if in CRYPTO_LIVE_STRATEGIES AND status.mode !== shadow.
 */
export function isCryptoStrategyLive(strategyId: string): boolean {
  const list = parseCryptoLiveStrategiesList();
  if (!list.has(strategyId as CryptoStrategyId)) return false;
  return getStrategyMode(strategyId) === "live";
}

export function cryptoStrategyEffectiveMode(strategyId: string): StrategyMode {
  return isCryptoStrategyLive(strategyId) ? "live" : "shadow";
}

/** Deploy timestamp for 48h new-strategy caps. */
export function cryptoLiveDeployAtMs(): number {
  const raw =
    readCryptoEnvLocal("CRYPTO_LIVE_DEPLOY_AT") ??
    process.env.CRYPTO_LIVE_DEPLOY_AT ??
    "";
  if (raw.trim()) {
    const t = Date.parse(raw.trim());
    if (Number.isFinite(t)) return t;
  }
  return getDeployAtMs();
}

export function isWithinNewStrategyWarmup(): boolean {
  return Date.now() - cryptoLiveDeployAtMs() < 48 * 60 * 60_000;
}
