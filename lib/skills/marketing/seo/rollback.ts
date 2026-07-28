/** ForgeOS Marketing Seo — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { SEO_CONFIG } from "./registry";

export function buildSeoRollback(action: string) {
  return buildRollbackPlan(SEO_CONFIG, action);
}
