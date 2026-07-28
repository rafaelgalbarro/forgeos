/** ForgeOS Marketing Content — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { CONTENT_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeContentMock(context: MarketingMockContext) {
  return executeMock(CONTENT_CONFIG, context);
}
