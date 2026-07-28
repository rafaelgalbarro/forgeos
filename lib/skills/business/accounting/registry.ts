/** ForgeOS Business Skills — Business Accounting registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { ACCOUNTING_DEF } from "./types";

export const ACCOUNTING_SKILL = buildRegistry(ACCOUNTING_DEF);
export const ACCOUNTING_ACTIONS = ACCOUNTING_DEF.actions;
