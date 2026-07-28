/** ForgeOS Marketing Analytics — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { ANALYTICS_CONFIG } from "./registry";

export function dispatchAnalyticsToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(ANALYTICS_CONFIG, params);
}
