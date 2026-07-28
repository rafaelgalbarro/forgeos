/** ForgeOS Marketing Ads — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { ADS_CONFIG } from "./registry";

export function buildAdsRollback(action: string) {
  return buildRollbackPlan(ADS_CONFIG, action);
}
