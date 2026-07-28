/** ForgeOS Productivity Calendar — permissions (RC4.3). */

import { createProductivityPermissions } from "../create-provider";
import { CALENDAR_CONFIG } from "../provider-configs";

export const CALENDAR_PERMISSIONS = createProductivityPermissions(CALENDAR_CONFIG);
