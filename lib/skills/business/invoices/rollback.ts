/** ForgeOS Business Skills — Business Invoices rollback (RC4.4). */

import { buildRollback } from "../shared/factory";
import { INVOICES_DEF } from "./types";

export const INVOICES_ROLLBACK = buildRollback(INVOICES_DEF);
