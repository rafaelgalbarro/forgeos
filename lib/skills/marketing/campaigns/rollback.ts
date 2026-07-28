/** ForgeOS Marketing Campaigns — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { CAMPAIGNS_CONFIG } from "./registry";

export function buildCampaignsRollback(action: string) {
  return buildRollbackPlan(CAMPAIGNS_CONFIG, action);
}
