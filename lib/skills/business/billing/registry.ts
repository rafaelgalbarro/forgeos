/** ForgeOS Business Skills — Business Billing registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { BILLING_DEF } from "./types";

export const BILLING_SKILL = buildRegistry(BILLING_DEF);
export const BILLING_ACTIONS = BILLING_DEF.actions;
