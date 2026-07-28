/** ForgeOS Marketing Social — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { SOCIAL_CONFIG } from "./registry";

export function buildSocialRollback(action: string) {
  return buildRollbackPlan(SOCIAL_CONFIG, action);
}
