/** ForgeOS Productivity Files — registry (RC4.3). */

import { FILES_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const FILES_METADATA = createProductivityMetadata(FILES_CONFIG);
export const FILES_DEFINITION = createProductivityDefinition(FILES_CONFIG, FILES_METADATA);
export const FILES_ACTIONS = FILES_CONFIG.actions;
