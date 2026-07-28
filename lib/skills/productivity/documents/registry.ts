/** ForgeOS Productivity Documents — registry (RC4.3). */

import { DOCUMENTS_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const DOCUMENTS_METADATA = createProductivityMetadata(DOCUMENTS_CONFIG);
export const DOCUMENTS_DEFINITION = createProductivityDefinition(DOCUMENTS_CONFIG, DOCUMENTS_METADATA);
export const DOCUMENTS_ACTIONS = DOCUMENTS_CONFIG.actions;
