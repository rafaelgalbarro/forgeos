/** ForgeOS AI images capability — permissions (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(IMAGES_CONFIG);
