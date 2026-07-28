/** ForgeOS Marketing Email — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { EMAIL_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeEmailMock(context: MarketingMockContext) {
  return executeMock(EMAIL_CONFIG, context);
}
