/** Analytics Reports — permissions (RC4.6). */

import { buildPermissions } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";

export const REPORTS_PERMISSIONS = buildPermissions(REPORTS_DEF);
