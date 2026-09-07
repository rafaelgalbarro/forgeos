/**
 * Position & risk overlay on real IBKR portfolio (read-only).
 * Defensive recommendations only — no order submission while LOCKED.
 */

import { loadAutonomousLiveLimits } from "./limits";
import type { AutonomousLiveLimits, ExitReason, ExitSignal } from "./domain";
import { createExitSignal, prioritizeExits } from "./guards";

export interface PortfolioPositionInput {
  readonly symbol: string;
  readonly quantity: number;
  readonly avgCost: number;
  readonly marketPrice?: number | null;
  readonly unrealizedPnl?: number | null;
  readonly stopPrice?: number | null;
  readonly targetPrice?: number | null;
  readonly openedAt?: string | null;
}

export interface PositionOverlayRecommendation {
  readonly symbol: string;
  readonly action: "HOLD" | "TIGHTEN_STOP" | "REDUCE" | "EXIT" | "NO_ACTION";
  readonly exitSignals: readonly ExitSignal[];
  readonly reasoning: readonly string[];
  readonly defensiveOnly: true;
  readonly orderSubmitted: false;
}

export interface PortfolioRiskOverlay {
  readonly generatedAt: string;
  readonly positionCount: number;
  readonly grossExposureEur: number;
  readonly withinOpenPositionLimit: boolean;
  readonly recommendations: readonly PositionOverlayRecommendation[];
  readonly limits: AutonomousLiveLimits;
  readonly orderSubmitted: false;
}

export function overlayPortfolioRisk(args: {
  readonly positions: readonly PortfolioPositionInput[];
  readonly nowIso?: string;
  readonly dailyLossPct?: number;
  readonly maxTimeInPositionMs?: number;
}): PortfolioRiskOverlay {
  const nowIso = args.nowIso ?? new Date().toISOString();
  const limits = loadAutonomousLiveLimits();
  const maxTime = args.maxTimeInPositionMs ?? 7 * 24 * 60 * 60 * 1000;

  let gross = 0;
  const recommendations: PositionOverlayRecommendation[] = [];

  for (const pos of args.positions) {
    const px = pos.marketPrice ?? pos.avgCost;
    const exposure = Math.abs(pos.quantity * px);
    gross += exposure;

    const signals: ExitSignal[] = [];
    const reasoning: string[] = [];

    if (pos.stopPrice == null) {
      signals.push(createExitSignal("STOP", pos.symbol, nowIso));
      reasoning.push("Missing stop — defensive stop required");
    }
    if (pos.marketPrice != null && pos.stopPrice != null && pos.quantity > 0) {
      if (pos.marketPrice <= pos.stopPrice) {
        signals.push(createExitSignal("STOP", pos.symbol, nowIso));
        reasoning.push("Price at/below stop");
      }
    }
    if (pos.marketPrice != null && pos.targetPrice != null && pos.quantity > 0) {
      if (pos.marketPrice >= pos.targetPrice) {
        signals.push(createExitSignal("TAKE_PROFIT", pos.symbol, nowIso));
        reasoning.push("Price at/above target");
      }
    }
    if (args.dailyLossPct != null && args.dailyLossPct >= limits.maxDailyLossPct) {
      signals.push(createExitSignal("DAILY_MAX_LOSS", pos.symbol, nowIso));
      reasoning.push("Daily max loss — defensive exit priority");
    }
    if (pos.openedAt) {
      const age = new Date(nowIso).getTime() - new Date(pos.openedAt).getTime();
      if (Number.isFinite(age) && age > maxTime) {
        signals.push(createExitSignal("MAX_TIME_IN_POSITION", pos.symbol, nowIso));
        reasoning.push("Max time in position exceeded");
      }
    }

    const prioritized = prioritizeExits(signals);
    let action: PositionOverlayRecommendation["action"] = "HOLD";
    if (prioritized.some((s) => s.reason === "DAILY_MAX_LOSS" || s.reason === "EMERGENCY_CLOSE")) {
      action = "EXIT";
    } else if (prioritized.some((s) => s.reason === "STOP")) {
      action = pos.stopPrice == null ? "TIGHTEN_STOP" : "EXIT";
    } else if (prioritized.some((s) => s.reason === "TAKE_PROFIT")) {
      action = "REDUCE";
    } else if (prioritized.length > 0) {
      action = "TIGHTEN_STOP";
    }

    recommendations.push({
      symbol: pos.symbol,
      action: pos.quantity === 0 ? "NO_ACTION" : action,
      exitSignals: prioritized,
      reasoning: reasoning.length ? reasoning : ["Within defensive envelope"],
      defensiveOnly: true,
      orderSubmitted: false,
    });
  }

  return {
    generatedAt: nowIso,
    positionCount: args.positions.filter((p) => p.quantity !== 0).length,
    grossExposureEur: Number(gross.toFixed(2)),
    withinOpenPositionLimit: args.positions.filter((p) => p.quantity !== 0).length <= limits.maxOpenPositions,
    recommendations,
    limits,
    orderSubmitted: false,
  };
}

export function exitReasonLabel(reason: ExitReason): string {
  return reason.replace(/_/g, " ");
}
