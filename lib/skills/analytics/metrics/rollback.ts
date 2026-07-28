/** Analytics Metrics — rollback plans (RC4.6). */

import { buildRollback } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export const METRICS_ROLLBACK = buildRollback(METRICS_DEF);
