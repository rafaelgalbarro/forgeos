/** Analytics Dashboards — permissions (RC4.6). */

import { buildPermissions } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";

export const DASHBOARDS_PERMISSIONS = buildPermissions(DASHBOARDS_DEF);
