/** ForgeOS Productivity Calendar — registry (RC4.3). */

import { CALENDAR_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const CALENDAR_METADATA = createProductivityMetadata(CALENDAR_CONFIG);
export const CALENDAR_DEFINITION = createProductivityDefinition(CALENDAR_CONFIG, CALENDAR_METADATA);
export const CALENDAR_ACTIONS = CALENDAR_CONFIG.actions;
