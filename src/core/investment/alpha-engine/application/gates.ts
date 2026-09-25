/**
 * Hard rejection gates + dedupe/cooldown for Alpha Engine.
 */

import {
  ALPHA_COOLDOWN_MS_DEFAULT,
  type AlphaRejectReason,
} from "../domain/types";

export type AlphaGateContext = {
  readonly dataQuality: "live" | "fresh" | "aging" | "delayed" | "stale" | "demo" | "missing";
  readonly bid: number | null;
  readonly ask: number | null;
  readonly spreadPct: number | null;
  readonly maxSpreadPct: number;
  readonly liquidity: number | null;
  readonly minLiquidity: number;
  readonly marketOpen: boolean;
  readonly contractResolved: boolean;
  readonly riskExceedsLimits: boolean;
  readonly expired: boolean;
  readonly duplicate: boolean;
  readonly cooldownActive: boolean;
  readonly openPositionConflict: boolean;
};

export function evaluateAlphaHardGates(ctx: AlphaGateContext): AlphaRejectReason[] {
  const reasons: AlphaRejectReason[] = [];
  if (ctx.dataQuality === "delayed" || ctx.dataQuality === "stale") {
    reasons.push(ctx.dataQuality === "delayed" ? "delayed-data" : "stale-data");
  } else if (ctx.dataQuality !== "live") {
    reasons.push("non-real-data");
  }
  if (ctx.bid == null || ctx.ask == null || ctx.bid <= 0 || ctx.ask <= 0) {
    reasons.push("missing-bid-ask");
  }
  if (ctx.spreadPct != null && ctx.spreadPct > ctx.maxSpreadPct) {
    reasons.push("spread-excessive");
  }
  if (ctx.liquidity != null && ctx.liquidity < ctx.minLiquidity) {
    reasons.push("insufficient-liquidity");
  }
  if (!ctx.marketOpen) reasons.push("market-closed");
  if (!ctx.contractResolved) reasons.push("contract-unresolved");
  if (ctx.riskExceedsLimits) reasons.push("risk-exceeds-limits");
  if (ctx.expired) reasons.push("signal-expired");
  if (ctx.duplicate) reasons.push("duplicate");
  if (ctx.cooldownActive) reasons.push("cooldown-active");
  if (ctx.openPositionConflict) reasons.push("open-position-conflict");
  return reasons;
}

export class AlphaDedupeCooldownStore {
  private readonly seen = new Map<string, number>();
  private readonly cooldownMs: number;

  constructor(cooldownMs = ALPHA_COOLDOWN_MS_DEFAULT) {
    this.cooldownMs = cooldownMs;
  }

  key(asset: string, strategy: string): string {
    return `${asset.toUpperCase()}::${strategy}`;
  }

  isDuplicateOrCooling(asset: string, strategy: string, nowMs = Date.now()): boolean {
    const until = this.seen.get(this.key(asset, strategy));
    return until != null && until > nowMs;
  }

  mark(asset: string, strategy: string, nowMs = Date.now()): void {
    this.seen.set(this.key(asset, strategy), nowMs + this.cooldownMs);
  }

  prune(nowMs = Date.now()): void {
    for (const [k, until] of this.seen) {
      if (until < nowMs - 60_000) this.seen.delete(k);
    }
  }
}

let dedupeSingleton: AlphaDedupeCooldownStore | null = null;

export function getAlphaDedupeStore(): AlphaDedupeCooldownStore {
  if (!dedupeSingleton) dedupeSingleton = new AlphaDedupeCooldownStore();
  return dedupeSingleton;
}

export function resetAlphaDedupeStoreForTests(): void {
  dedupeSingleton = new AlphaDedupeCooldownStore();
}
