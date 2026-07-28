/** ForgeOS Marketing Automation — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { AUTOMATION_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeAutomationMock(context: MarketingMockContext) {
  return executeMock(AUTOMATION_CONFIG, context);
}
