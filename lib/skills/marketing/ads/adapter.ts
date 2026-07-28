/** ForgeOS Marketing Ads — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { ADS_CONFIG } from "./registry";

export function dispatchAdsToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(ADS_CONFIG, params);
}
