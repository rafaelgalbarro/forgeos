/** ForgeOS Productivity Knowledge — permissions (RC4.3). */

import { createProductivityPermissions } from "../create-provider";
import { KNOWLEDGE_CONFIG } from "../provider-configs";

export const KNOWLEDGE_PERMISSIONS = createProductivityPermissions(KNOWLEDGE_CONFIG);
