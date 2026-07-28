/** ForgeOS Marketing Seo — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { SEO_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeSeoMock(context: MarketingMockContext) {
  return executeMock(SEO_CONFIG, context);
}
