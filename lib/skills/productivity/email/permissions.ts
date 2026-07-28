/** ForgeOS Productivity Email — permissions (RC4.3). */

import { createProductivityPermissions } from "../create-provider";
import { EMAIL_CONFIG } from "../provider-configs";

export const EMAIL_PERMISSIONS = createProductivityPermissions(EMAIL_CONFIG);
