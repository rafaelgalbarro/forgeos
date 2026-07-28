/** ForgeOS Productivity Messaging — registry (RC4.3). */

import { MESSAGING_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const MESSAGING_METADATA = createProductivityMetadata(MESSAGING_CONFIG);
export const MESSAGING_DEFINITION = createProductivityDefinition(MESSAGING_CONFIG, MESSAGING_METADATA);
export const MESSAGING_ACTIONS = MESSAGING_CONFIG.actions;
