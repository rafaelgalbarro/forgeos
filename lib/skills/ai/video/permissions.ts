/** ForgeOS AI video capability — permissions (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(VIDEO_CONFIG);
