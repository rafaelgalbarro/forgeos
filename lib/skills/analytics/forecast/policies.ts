/** Analytics Forecast — policies (RC4.6). */

import { buildPolicies } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";

export const FORECAST_POLICIES = buildPolicies(FORECAST_DEF);
