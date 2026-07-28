/** ForgeOS Business Skills — Business Invoices policies (RC4.4). */

import { buildPolicies } from "../shared/factory";
import { INVOICES_DEF } from "./types";

export const INVOICES_POLICIES = buildPolicies(INVOICES_DEF);
