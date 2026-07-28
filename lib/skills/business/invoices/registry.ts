/** ForgeOS Business Skills — Business Invoices registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { INVOICES_DEF } from "./types";

export const INVOICES_SKILL = buildRegistry(INVOICES_DEF);
export const INVOICES_ACTIONS = INVOICES_DEF.actions;
