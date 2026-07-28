/** Analytics Forecast — rollback plans (RC4.6). */

import { buildRollback } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";

export const FORECAST_ROLLBACK = buildRollback(FORECAST_DEF);
