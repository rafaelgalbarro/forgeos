/** ForgeOS Business Skills — Business Accounting risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { ACCOUNTING_DEF } from "./types";

export const ACCOUNTING_RISK_MAP = buildActionRiskMaps(ACCOUNTING_DEF);
export function assessAccountingRisk(action: string) {
  return assessActionRisk(ACCOUNTING_DEF, action);
}
