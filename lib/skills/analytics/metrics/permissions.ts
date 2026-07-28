/** Analytics Metrics — permissions (RC4.6). */

import { buildPermissions } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export const METRICS_PERMISSIONS = buildPermissions(METRICS_DEF);
