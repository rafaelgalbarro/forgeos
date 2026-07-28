/** ForgeOS Business Skills — Business Billing risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { BILLING_DEF } from "./types";

export const BILLING_RISK_MAP = buildActionRiskMaps(BILLING_DEF);
export function assessBillingRisk(action: string) {
  return assessActionRisk(BILLING_DEF, action);
}
