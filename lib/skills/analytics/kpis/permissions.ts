/** Analytics KPIs — permissions (RC4.6). */

import { buildPermissions } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";

export const KPIS_PERMISSIONS = buildPermissions(KPIS_DEF);
