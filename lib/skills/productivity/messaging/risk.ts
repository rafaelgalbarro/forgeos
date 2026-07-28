/** ForgeOS Productivity Messaging — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { MESSAGING_CONFIG } from "../provider-configs";

export const assessMessagingRisk = createProductivityRiskAssessor(MESSAGING_CONFIG);
