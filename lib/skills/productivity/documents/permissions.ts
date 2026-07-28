/** ForgeOS Productivity Documents — permissions (RC4.3). */

import { createProductivityPermissions } from "../create-provider";
import { DOCUMENTS_CONFIG } from "../provider-configs";

export const DOCUMENTS_PERMISSIONS = createProductivityPermissions(DOCUMENTS_CONFIG);
