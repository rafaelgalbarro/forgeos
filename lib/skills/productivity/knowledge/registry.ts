/** ForgeOS Productivity Knowledge — registry (RC4.3). */

import { KNOWLEDGE_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const KNOWLEDGE_METADATA = createProductivityMetadata(KNOWLEDGE_CONFIG);
export const KNOWLEDGE_DEFINITION = createProductivityDefinition(KNOWLEDGE_CONFIG, KNOWLEDGE_METADATA);
export const KNOWLEDGE_ACTIONS = KNOWLEDGE_CONFIG.actions;
