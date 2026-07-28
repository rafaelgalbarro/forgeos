/** ForgeOS Productivity Meetings — permissions (RC4.3). */

import { createProductivityPermissions } from "../create-provider";
import { MEETINGS_CONFIG } from "../provider-configs";

export const MEETINGS_PERMISSIONS = createProductivityPermissions(MEETINGS_CONFIG);
