/** ForgeOS Productivity Meetings — registry (RC4.3). */

import { MEETINGS_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const MEETINGS_METADATA = createProductivityMetadata(MEETINGS_CONFIG);
export const MEETINGS_DEFINITION = createProductivityDefinition(MEETINGS_CONFIG, MEETINGS_METADATA);
export const MEETINGS_ACTIONS = MEETINGS_CONFIG.actions;
