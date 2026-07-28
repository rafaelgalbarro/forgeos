/** ForgeOS Marketing Social — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { SOCIAL_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeSocialMock(context: MarketingMockContext) {
  return executeMock(SOCIAL_CONFIG, context);
}
