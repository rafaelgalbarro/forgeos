/** Analytics Reports — rollback plans (RC4.6). */

import { buildRollback } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";

export const REPORTS_ROLLBACK = buildRollback(REPORTS_DEF);
