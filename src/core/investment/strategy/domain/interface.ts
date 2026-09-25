import {
  assertConfidence,
  assertNonEmpty,
  assertPercent,
  assertSerializable,
} from "../../domain/guards";
import type {
  EntryIntent,
  ExitIntent,
  PositionIntent,
  StrategyAnalysis,
  StrategyId,
  StrategyIntent,
  StrategyMarketContext,
  StrategyMetadata,
  StrategyPositionContext,
} from "./types";
import { FORBIDDEN_ORDER_KEYS, STRATEGY_IDS } from "./types";

/**
 * Core Strategy Engine contract.
 * Implementations MUST return intents only and MUST NOT send orders.
 */
export interface InvestmentStrategy {
  readonly id: StrategyId;
  readonly metadata: StrategyMetadata;

  analyze(context: StrategyMarketContext): StrategyAnalysis;

  generateEntry(
    context: StrategyMarketContext,
    analysis?: StrategyAnalysis,
  ): EntryIntent | null;

  managePosition(
    context: StrategyMarketContext,
    position: StrategyPositionContext,
  ): PositionIntent;

  generateExit(
    context: StrategyMarketContext,
    position: StrategyPositionContext,
  ): ExitIntent | null;
}

export function isStrategyId(value: string): value is StrategyId {
  return (STRATEGY_IDS as readonly string[]).includes(value);
}

export function assertNoOrderPath(value: unknown, fieldName: string): void {
  const visit = (current: unknown, path: string): void => {
    if (current === null || current === undefined || typeof current !== "object") {
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      for (const forbidden of FORBIDDEN_ORDER_KEYS) {
        if (lower === forbidden.toLowerCase()) {
          throw new Error(`${fieldName}${path} must not contain order-path key "${key}"`);
        }
      }
      visit(nested, `${path}.${key}`);
    }
  };
  visit(value, "");
}

export function ensureEntryIntent(intent: EntryIntent): EntryIntent {
  assertNonEmpty(intent.strategyId, "EntryIntent.strategyId");
  assertNonEmpty(intent.symbol, "EntryIntent.symbol");
  assertNonEmpty(intent.timeframe, "EntryIntent.timeframe");
  assertNonEmpty(intent.rationale, "EntryIntent.rationale");
  assertNonEmpty(intent.generatedAt, "EntryIntent.generatedAt");
  assertNonEmpty(intent.expiresAt, "EntryIntent.expiresAt");
  assertConfidence(intent.conviction, "EntryIntent.conviction");
  if (intent.kind !== "entry") {
    throw new Error("EntryIntent.kind must be \"entry\"");
  }
  if (intent.suggestedSizePct !== undefined) {
    assertPercent(intent.suggestedSizePct, "EntryIntent.suggestedSizePct");
  }
  assertSerializable(intent, "EntryIntent");
  assertNoOrderPath(intent, "EntryIntent");
  return intent;
}

export function ensureExitIntent(intent: ExitIntent): ExitIntent {
  assertNonEmpty(intent.strategyId, "ExitIntent.strategyId");
  assertNonEmpty(intent.symbol, "ExitIntent.symbol");
  assertNonEmpty(intent.reason, "ExitIntent.reason");
  assertNonEmpty(intent.generatedAt, "ExitIntent.generatedAt");
  assertNonEmpty(intent.expiresAt, "ExitIntent.expiresAt");
  if (intent.kind !== "exit") {
    throw new Error("ExitIntent.kind must be \"exit\"");
  }
  assertConfidence(intent.exitFraction, "ExitIntent.exitFraction");
  assertSerializable(intent, "ExitIntent");
  assertNoOrderPath(intent, "ExitIntent");
  return intent;
}

export function ensurePositionIntent(intent: PositionIntent): PositionIntent {
  assertNonEmpty(intent.strategyId, "PositionIntent.strategyId");
  assertNonEmpty(intent.symbol, "PositionIntent.symbol");
  assertNonEmpty(intent.rationale, "PositionIntent.rationale");
  assertNonEmpty(intent.generatedAt, "PositionIntent.generatedAt");
  assertNonEmpty(intent.expiresAt, "PositionIntent.expiresAt");
  if (intent.kind !== "position") {
    throw new Error("PositionIntent.kind must be \"position\"");
  }
  assertSerializable(intent, "PositionIntent");
  assertNoOrderPath(intent, "PositionIntent");
  return intent;
}

export function ensureStrategyIntent(intent: StrategyIntent): StrategyIntent {
  switch (intent.kind) {
    case "entry":
      return ensureEntryIntent(intent);
    case "exit":
      return ensureExitIntent(intent);
    case "position":
      return ensurePositionIntent(intent);
    default: {
      const _exhaustive: never = intent;
      throw new Error(`Unknown intent kind: ${String(_exhaustive)}`);
    }
  }
}

export function ensureStrategyMetadata(metadata: StrategyMetadata): StrategyMetadata {
  assertNonEmpty(metadata.strategyId, "StrategyMetadata.strategyId");
  assertNonEmpty(metadata.name, "StrategyMetadata.name");
  assertNonEmpty(metadata.version, "StrategyMetadata.version");
  assertNonEmpty(metadata.author, "StrategyMetadata.author");
  assertNonEmpty(metadata.date, "StrategyMetadata.date");
  if (metadata.assumptions.length === 0) {
    throw new Error("StrategyMetadata.assumptions must not be empty");
  }
  if (metadata.limitations.length === 0) {
    throw new Error("StrategyMetadata.limitations must not be empty");
  }
  if (metadata.compatibleRegimes.length === 0) {
    throw new Error("StrategyMetadata.compatibleRegimes must not be empty");
  }
  if (metadata.risks.length === 0) {
    throw new Error("StrategyMetadata.risks must not be empty");
  }
  if (metadata.evidences.length === 0) {
    throw new Error("StrategyMetadata.evidences must not be empty");
  }
  assertSerializable(metadata, "StrategyMetadata");
  return metadata;
}

export function assertImplementsInvestmentStrategy(strategy: InvestmentStrategy): void {
  if (!isStrategyId(strategy.id)) {
    throw new Error(`Invalid strategy id: ${strategy.id}`);
  }
  if (typeof strategy.analyze !== "function") {
    throw new Error(`${strategy.id} missing analyze()`);
  }
  if (typeof strategy.generateEntry !== "function") {
    throw new Error(`${strategy.id} missing generateEntry()`);
  }
  if (typeof strategy.managePosition !== "function") {
    throw new Error(`${strategy.id} missing managePosition()`);
  }
  if (typeof strategy.generateExit !== "function") {
    throw new Error(`${strategy.id} missing generateExit()`);
  }
  ensureStrategyMetadata(strategy.metadata);
  if (strategy.metadata.strategyId !== strategy.id) {
    throw new Error(`${strategy.id} metadata.strategyId mismatch`);
  }
}
