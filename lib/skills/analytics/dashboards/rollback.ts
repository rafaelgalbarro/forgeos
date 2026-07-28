/** Analytics Dashboards — rollback plans (RC4.6). */

import { buildRollback } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";

export const DASHBOARDS_ROLLBACK = buildRollback(DASHBOARDS_DEF);
