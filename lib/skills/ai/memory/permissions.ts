/** ForgeOS AI memory capability — permissions (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(MEMORY_CONFIG);
