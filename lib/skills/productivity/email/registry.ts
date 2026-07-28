/** ForgeOS Productivity Email — registry (RC4.3). */

import { EMAIL_CONFIG } from "../provider-configs";
import { createProductivityMetadata, createProductivityDefinition } from "../create-provider";

export const EMAIL_METADATA = createProductivityMetadata(EMAIL_CONFIG);
export const EMAIL_DEFINITION = createProductivityDefinition(EMAIL_CONFIG, EMAIL_METADATA);
export const EMAIL_ACTIONS = EMAIL_CONFIG.actions;
