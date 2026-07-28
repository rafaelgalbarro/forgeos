/** ForgeOS Marketing Ads — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { ADS_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeAdsMock(context: MarketingMockContext) {
  return executeMock(ADS_CONFIG, context);
}
