/** ForgeOS Marketing Campaigns — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { CAMPAIGNS_CONFIG } from "./registry";

export function dispatchCampaignsToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(CAMPAIGNS_CONFIG, params);
}
