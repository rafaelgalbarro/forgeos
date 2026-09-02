import {
  assertImplementsInvestmentStrategy,
  ensureStrategyMetadata,
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

/**
 * In-memory metadata + strategy registry for the Strategy Engine.
 * Strategies register here; the engine never routes to brokers.
 */
export class StrategyMetadataRegistry {
  private readonly byId = new Map<StrategyId, StrategyMetadata>();

  register(metadata: StrategyMetadata): void {
    const validated = ensureStrategyMetadata(metadata);
    this.byId.set(validated.strategyId, validated);
  }

  get(strategyId: StrategyId): StrategyMetadata | undefined {
    return this.byId.get(strategyId);
  }

  list(): readonly StrategyMetadata[] {
    return [...this.byId.values()];
  }

  has(strategyId: StrategyId): boolean {
    return this.byId.has(strategyId);
  }

  size(): number {
    return this.byId.size;
  }
}

export interface StrategyEngineSnapshot {
  readonly strategyIds: readonly StrategyId[];
  readonly metadata: readonly StrategyMetadata[];
}

/**
 * Application facade: discover strategies, run analysis, emit intents.
 * Explicitly has no order / broker methods.
 */
export class StrategyEngine {
  private readonly strategies = new Map<StrategyId, InvestmentStrategy>();
  readonly metadataRegistry: StrategyMetadataRegistry;

  constructor(metadataRegistry: StrategyMetadataRegistry = new StrategyMetadataRegistry()) {
    this.metadataRegistry = metadataRegistry;
  }

  register(strategy: InvestmentStrategy): void {
    assertImplementsInvestmentStrategy(strategy);
    this.strategies.set(strategy.id, strategy);
    this.metadataRegistry.register(strategy.metadata);
  }

  get(strategyId: StrategyId): InvestmentStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  list(): readonly InvestmentStrategy[] {
    return [...this.strategies.values()];
  }

  listMetadata(): readonly StrategyMetadata[] {
    return this.metadataRegistry.list();
  }

  snapshot(): StrategyEngineSnapshot {
    return {
      strategyIds: this.list().map((s) => s.id),
      metadata: this.listMetadata(),
    };
  }

  analyze(strategyId: StrategyId, context: StrategyMarketContext): StrategyAnalysis {
    return this.require(strategyId).analyze(context);
  }

  generateEntry(
    strategyId: StrategyId,
    context: StrategyMarketContext,
    analysis?: StrategyAnalysis,
  ): EntryIntent | null {
    return this.require(strategyId).generateEntry(context, analysis);
  }

  managePosition(
    strategyId: StrategyId,
    context: StrategyMarketContext,
    position: StrategyPositionContext,
  ): PositionIntent {
    return this.require(strategyId).managePosition(context, position);
  }

  generateExit(
    strategyId: StrategyId,
    context: StrategyMarketContext,
    position: StrategyPositionContext,
  ): ExitIntent | null {
    return this.require(strategyId).generateExit(context, position);
  }

  analyzeAll(context: StrategyMarketContext): readonly StrategyAnalysis[] {
    return this.list().map((strategy) => strategy.analyze(context));
  }

  /** Analyze only strategies currently enabled in the activation store (default: all enabled). */
  analyzeEnabled(
    context: StrategyMarketContext,
    isEnabled: (strategyId: StrategyId) => boolean,
  ): readonly StrategyAnalysis[] {
    return this.list()
      .filter((strategy) => isEnabled(strategy.id))
      .map((strategy) => strategy.analyze(context));
  }

  private require(strategyId: StrategyId): InvestmentStrategy {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not registered: ${strategyId}`);
    }
    return strategy;
  }
}
