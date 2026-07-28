/** Analytics Predictions — permissions (RC4.6). */

import { buildPermissions } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export const PREDICTIONS_PERMISSIONS = buildPermissions(PREDICTIONS_DEF);
