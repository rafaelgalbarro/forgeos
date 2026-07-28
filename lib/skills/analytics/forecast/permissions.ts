/** Analytics Forecast — permissions (RC4.6). */

import { buildPermissions } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";

export const FORECAST_PERMISSIONS = buildPermissions(FORECAST_DEF);
