/** ForgeOS Marketing Seo — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { SEO_CONFIG } from "./registry";

export function assessSeoRisk(action: string) {
  return assessActionRisk(SEO_CONFIG, action);
}
