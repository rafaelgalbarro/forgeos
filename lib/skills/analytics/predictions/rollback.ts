/** Analytics Predictions — rollback plans (RC4.6). */

import { buildRollback } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export const PREDICTIONS_ROLLBACK = buildRollback(PREDICTIONS_DEF);
