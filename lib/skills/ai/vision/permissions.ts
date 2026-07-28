/** ForgeOS AI vision capability — permissions (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(VISION_CONFIG);
