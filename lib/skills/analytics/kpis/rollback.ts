/** Analytics KPIs — rollback plans (RC4.6). */

import { buildRollback } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";

export const KPIS_ROLLBACK = buildRollback(KPIS_DEF);
