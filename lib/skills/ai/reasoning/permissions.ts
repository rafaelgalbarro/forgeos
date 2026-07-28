/** ForgeOS AI reasoning capability — permissions (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(REASONING_CONFIG);
