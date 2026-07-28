/** ForgeOS Marketing Content — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { CONTENT_CONFIG } from "./registry";

export function buildContentRollback(action: string) {
  return buildRollbackPlan(CONTENT_CONFIG, action);
}
