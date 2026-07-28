/** ForgeOS Marketing Analytics — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { ANALYTICS_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeAnalyticsMock(context: MarketingMockContext) {
  return executeMock(ANALYTICS_CONFIG, context);
}
