/** ForgeOS Productivity Messaging — permissions (RC4.3). */

import { createProductivityPermissions } from "../create-provider";
import { MESSAGING_CONFIG } from "../provider-configs";

export const MESSAGING_PERMISSIONS = createProductivityPermissions(MESSAGING_CONFIG);
