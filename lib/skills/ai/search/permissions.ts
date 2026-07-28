/** ForgeOS AI search capability — permissions (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(SEARCH_CONFIG);
