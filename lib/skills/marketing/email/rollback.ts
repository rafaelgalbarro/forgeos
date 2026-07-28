/** ForgeOS Marketing Email — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { EMAIL_CONFIG } from "./registry";

export function buildEmailRollback(action: string) {
  return buildRollbackPlan(EMAIL_CONFIG, action);
}
