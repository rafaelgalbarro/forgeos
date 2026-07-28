/** ForgeOS AI audio capability — permissions (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(AUDIO_CONFIG);
