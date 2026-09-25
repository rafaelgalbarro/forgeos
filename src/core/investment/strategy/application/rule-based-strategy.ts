import {
  addHoursIso,
  clamp01,
  clampScore,
  ensureEntryIntent,
  ensureExitIntent,
  ensurePositionIntent,
  ensureStrategyMetadata,
  evaluateRegimeFit,
  type EntryIntent,
  type ExitIntent,
  type InvestmentStrategy,
  type PositionIntent,
  type StrategyAnalysis,
  type StrategyId,
  type StrategyMarketContext,
  type StrategyMetadata,
  type StrategyPositionContext,
} from "../domain";

export interface StrategyRuleHooks {
  score(context: StrategyMarketContext): {
    score: number;
    bias: StrategyAnalysis["bias"];
    summary: string;
    evidence: readonly string[];
    metrics: Readonly<Record<string, number>>;
  };
  shouldEnter?(
    context: StrategyMarketContext,
    analysis: StrategyAnalysis,
  ): { side: EntryIntent["side"]; conviction: number; rationale: string; evidence: readonly string[] } | null;
  manage?(
    context: StrategyMarketContext,
    position: StrategyPositionContext,
    analysis: StrategyAnalysis,
  ): Omit<PositionIntent, "kind" | "strategyId" | "symbol" | "positionId" | "generatedAt" | "expiresAt">;
  shouldExit?(
    context: StrategyMarketContext,
    position: StrategyPositionContext,
    analysis: StrategyAnalysis,
  ): { urgency: ExitIntent["urgency"]; exitFraction: number; reason: string; evidence: readonly string[] } | null;
}

export interface RuleBasedStrategyConfig {
  readonly id: StrategyId;
  readonly metadata: StrategyMetadata;
  readonly timeframe?: string;
  readonly intentTtlHours?: number;
  readonly defaultSizePct?: number;
  readonly hooks: StrategyRuleHooks;
}

/**
 * Shared rule-based InvestmentStrategy implementation.
 * Produces serializable intents only — no order submission.
 */
export class RuleBasedInvestmentStrategy implements InvestmentStrategy {
  readonly id: StrategyId;
  readonly metadata: StrategyMetadata;
  private readonly timeframe: string;
  private readonly intentTtlHours: number;
  private readonly defaultSizePct: number;
  private readonly hooks: StrategyRuleHooks;

  constructor(config: RuleBasedStrategyConfig) {
    this.id = config.id;
    this.metadata = ensureStrategyMetadata(config.metadata);
    this.timeframe = config.timeframe ?? "1d";
    this.intentTtlHours = config.intentTtlHours ?? 24;
    this.defaultSizePct = config.defaultSizePct ?? 5;
    this.hooks = config.hooks;
  }

  analyze(context: StrategyMarketContext): StrategyAnalysis {
    const scored = this.hooks.score(context);
    const regimeFit = evaluateRegimeFit(context.regime, this.metadata);
    return {
      strategyId: this.id,
      symbol: context.symbol,
      score: clampScore(scored.score),
      bias: scored.bias,
      regimeFit,
      summary: scored.summary,
      evidence: scored.evidence,
      metrics: scored.metrics,
      analyzedAt: context.capturedAt,
    };
  }

  generateEntry(
    context: StrategyMarketContext,
    analysis?: StrategyAnalysis,
  ): EntryIntent | null {
    const resolved = analysis ?? this.analyze(context);
    if (resolved.regimeFit === "incompatible") {
      return null;
    }
    if (!this.hooks.shouldEnter) {
      return null;
    }
    const signal = this.hooks.shouldEnter(context, resolved);
    if (!signal) {
      return null;
    }

    const atr = context.atr ?? context.price * 0.02;
    const invalidation =
      signal.side === "long" ? context.price - 1.5 * atr : context.price + 1.5 * atr;
    const target =
      signal.side === "long" ? context.price + 2.5 * atr : context.price - 2.5 * atr;
    const band = Math.max(atr * 0.25, context.price * 0.002);

    return ensureEntryIntent({
      kind: "entry",
      strategyId: this.id,
      symbol: context.symbol,
      side: signal.side,
      conviction: clamp01(signal.conviction),
      suggestedSizePct: this.defaultSizePct * clamp01(signal.conviction),
      entryZone: {
        from: Math.min(context.price - band, context.price + band),
        to: Math.max(context.price - band, context.price + band),
      },
      invalidationLevel: invalidation,
      targetLevel: target,
      timeframe: this.timeframe,
      rationale: signal.rationale,
      evidence: signal.evidence,
      generatedAt: context.capturedAt,
      expiresAt: addHoursIso(context.capturedAt, this.intentTtlHours),
      metadata: {
        score: resolved.score,
        regimeFit: resolved.regimeFit,
        regime: context.regime,
      },
    });
  }

  managePosition(
    context: StrategyMarketContext,
    position: StrategyPositionContext,
  ): PositionIntent {
    const analysis = this.analyze(context);
    const managed = this.hooks.manage
      ? this.hooks.manage(context, position, analysis)
      : defaultManage(context, position, analysis);

    return ensurePositionIntent({
      kind: "position",
      strategyId: this.id,
      symbol: context.symbol,
      positionId: position.positionId,
      action: managed.action,
      suggestedSizePct: managed.suggestedSizePct,
      stopLevel: managed.stopLevel,
      targetLevel: managed.targetLevel,
      rationale: managed.rationale,
      evidence: managed.evidence,
      generatedAt: context.capturedAt,
      expiresAt: addHoursIso(context.capturedAt, this.intentTtlHours),
      metadata: managed.metadata,
    });
  }

  generateExit(
    context: StrategyMarketContext,
    position: StrategyPositionContext,
  ): ExitIntent | null {
    const analysis = this.analyze(context);
    if (!this.hooks.shouldExit) {
      return defaultExit(this.id, context, position, analysis, this.intentTtlHours);
    }
    const signal = this.hooks.shouldExit(context, position, analysis);
    if (!signal) {
      return null;
    }
    return ensureExitIntent({
      kind: "exit",
      strategyId: this.id,
      symbol: context.symbol,
      positionId: position.positionId,
      side: position.side,
      urgency: signal.urgency,
      exitFraction: clamp01(signal.exitFraction),
      reason: signal.reason,
      evidence: signal.evidence,
      generatedAt: context.capturedAt,
      expiresAt: addHoursIso(context.capturedAt, Math.min(this.intentTtlHours, 8)),
      metadata: {
        score: analysis.score,
        unrealizedPnlPct: position.unrealizedPnlPct,
      },
    });
  }
}

function defaultManage(
  context: StrategyMarketContext,
  position: StrategyPositionContext,
  analysis: StrategyAnalysis,
): Omit<PositionIntent, "kind" | "strategyId" | "symbol" | "positionId" | "generatedAt" | "expiresAt"> {
  const atr = context.atr ?? context.price * 0.02;
  if (position.unrealizedPnlPct >= 8) {
    return {
      action: "trail",
      stopLevel:
        position.side === "long"
          ? Math.max(position.stopLevel ?? 0, context.price - atr)
          : Math.min(position.stopLevel ?? Number.POSITIVE_INFINITY, context.price + atr),
      targetLevel: position.targetLevel,
      rationale: "Lock gains with trailing stop after favorable move.",
      evidence: [`unrealizedPnlPct=${position.unrealizedPnlPct.toFixed(2)}`],
    };
  }
  if (analysis.regimeFit === "incompatible") {
    return {
      action: "scale-out",
      suggestedSizePct: 50,
      rationale: "Regime incompatible with strategy thesis; reduce exposure.",
      evidence: [`regime=${context.regime}`, `regimeFit=${analysis.regimeFit}`],
    };
  }
  if (Math.abs(analysis.score) < 0.15) {
    return {
      action: "hold",
      stopLevel: position.stopLevel,
      targetLevel: position.targetLevel,
      rationale: "Signal weak; maintain position with existing risk controls.",
      evidence: [`score=${analysis.score.toFixed(3)}`],
    };
  }
  const aligned =
    (position.side === "long" && analysis.bias === "bullish") ||
    (position.side === "short" && analysis.bias === "bearish");
  if (aligned && Math.abs(analysis.score) > 0.55 && position.unrealizedPnlPct > 0) {
    return {
      action: "scale-in",
      suggestedSizePct: 2,
      rationale: "Thesis strengthening with positive PnL; consider modest scale-in.",
      evidence: [`score=${analysis.score.toFixed(3)}`, `bias=${analysis.bias}`],
    };
  }
  if (!aligned && Math.abs(analysis.score) > 0.4) {
    return {
      action: "tighten-stop",
      stopLevel:
        position.side === "long"
          ? Math.max(position.stopLevel ?? 0, context.price - 0.8 * atr)
          : Math.min(position.stopLevel ?? Number.POSITIVE_INFINITY, context.price + 0.8 * atr),
      rationale: "Thesis weakening versus position side; tighten risk.",
      evidence: [`score=${analysis.score.toFixed(3)}`, `bias=${analysis.bias}`],
    };
  }
  return {
    action: "hold",
    stopLevel: position.stopLevel,
    targetLevel: position.targetLevel,
    rationale: "No material change in thesis; hold.",
    evidence: [`score=${analysis.score.toFixed(3)}`],
  };
}

function defaultExit(
  strategyId: StrategyId,
  context: StrategyMarketContext,
  position: StrategyPositionContext,
  analysis: StrategyAnalysis,
  ttlHours: number,
): ExitIntent | null {
  if (position.unrealizedPnlPct <= -6) {
    return ensureExitIntent({
      kind: "exit",
      strategyId,
      symbol: context.symbol,
      positionId: position.positionId,
      side: position.side,
      urgency: "high",
      exitFraction: 1,
      reason: "Stop-loss style drawdown threshold breached.",
      evidence: [`unrealizedPnlPct=${position.unrealizedPnlPct.toFixed(2)}`],
      generatedAt: context.capturedAt,
      expiresAt: addHoursIso(context.capturedAt, Math.min(ttlHours, 4)),
    });
  }
  if (analysis.regimeFit === "incompatible" && Math.abs(analysis.score) > 0.3) {
    return ensureExitIntent({
      kind: "exit",
      strategyId,
      symbol: context.symbol,
      positionId: position.positionId,
      side: position.side,
      urgency: "medium",
      exitFraction: 1,
      reason: "Market regime incompatible with strategy.",
      evidence: [`regime=${context.regime}`, `score=${analysis.score.toFixed(3)}`],
      generatedAt: context.capturedAt,
      expiresAt: addHoursIso(context.capturedAt, Math.min(ttlHours, 8)),
    });
  }
  const opposed =
    (position.side === "long" && analysis.bias === "bearish" && analysis.score < -0.45) ||
    (position.side === "short" && analysis.bias === "bullish" && analysis.score > 0.45);
  if (opposed) {
    return ensureExitIntent({
      kind: "exit",
      strategyId,
      symbol: context.symbol,
      positionId: position.positionId,
      side: position.side,
      urgency: "medium",
      exitFraction: 1,
      reason: "Strategy bias flipped against open position.",
      evidence: [`bias=${analysis.bias}`, `score=${analysis.score.toFixed(3)}`],
      generatedAt: context.capturedAt,
      expiresAt: addHoursIso(context.capturedAt, Math.min(ttlHours, 8)),
    });
  }
  return null;
}
