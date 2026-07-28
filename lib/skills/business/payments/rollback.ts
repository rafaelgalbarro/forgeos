/** ForgeOS Business Skills — Business Payments rollback (RC4.4). */

import { buildRollback } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";

export const PAYMENTS_ROLLBACK = buildRollback(PAYMENTS_DEF);
