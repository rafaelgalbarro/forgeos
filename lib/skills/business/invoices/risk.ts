/** ForgeOS Business Skills — Business Invoices risk (RC4.4). */

import { assessActionRisk, buildActionRiskMaps } from "../shared/factory";
import { INVOICES_DEF } from "./types";

export const INVOICES_RISK_MAP = buildActionRiskMaps(INVOICES_DEF);
export function assessInvoicesRisk(action: string) {
  return assessActionRisk(INVOICES_DEF, action);
}
