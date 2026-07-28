/** ForgeOS AI voice capability — permissions (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(VOICE_CONFIG);
