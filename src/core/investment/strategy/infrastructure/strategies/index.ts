export { buildMetadata } from "./metadata";
export { createTrendFollowingStrategy } from "./trend-following";
export { createMomentumStrategy } from "./momentum";
export { createMeanReversionStrategy } from "./mean-reversion";
export { createBreakoutStrategy } from "./breakout";
export { createLowVolatilityStrategy } from "./low-volatility";
export { createQualityStrategy } from "./quality";
export { createGrowthStrategy } from "./growth";
export { createValueStrategy } from "./value";
export { createDividendStrategy } from "./dividend";
export { createMarketNeutralStrategy } from "./market-neutral";
export {
  createSwingTradingStrategy,
  createPositionTradingStrategy,
  createRelativeStrengthStrategy,
  createPairsTradingStrategy,
  createSectorRotationStrategy,
  createEventDrivenStrategy,
  createEarningsStrategy,
  createCarryStrategy,
  createRebalancingStrategy,
} from "./extended";

import type { InvestmentStrategy } from "../../domain";
import { createBreakoutStrategy } from "./breakout";
import { createDividendStrategy } from "./dividend";
import {
  createCarryStrategy,
  createEarningsStrategy,
  createEventDrivenStrategy,
  createPairsTradingStrategy,
  createPositionTradingStrategy,
  createRebalancingStrategy,
  createRelativeStrengthStrategy,
  createSectorRotationStrategy,
  createSwingTradingStrategy,
} from "./extended";
import { createGrowthStrategy } from "./growth";
import { createLowVolatilityStrategy } from "./low-volatility";
import { createMarketNeutralStrategy } from "./market-neutral";
import { createMeanReversionStrategy } from "./mean-reversion";
import { createMomentumStrategy } from "./momentum";
import { createQualityStrategy } from "./quality";
import { createTrendFollowingStrategy } from "./trend-following";
import { createValueStrategy } from "./value";

/** Factory: all ForgeOS Investment OS strategies (intent-only). */
export function createAllStrategies(): readonly InvestmentStrategy[] {
  return [
    createTrendFollowingStrategy(),
    createMomentumStrategy(),
    createMeanReversionStrategy(),
    createBreakoutStrategy(),
    createLowVolatilityStrategy(),
    createQualityStrategy(),
    createGrowthStrategy(),
    createValueStrategy(),
    createDividendStrategy(),
    createMarketNeutralStrategy(),
    createSwingTradingStrategy(),
    createPositionTradingStrategy(),
    createRelativeStrengthStrategy(),
    createPairsTradingStrategy(),
    createSectorRotationStrategy(),
    createEventDrivenStrategy(),
    createEarningsStrategy(),
    createCarryStrategy(),
    createRebalancingStrategy(),
  ];
}
