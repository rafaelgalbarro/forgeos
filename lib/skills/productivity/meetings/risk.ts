/** ForgeOS Productivity Meetings — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { MEETINGS_CONFIG } from "../provider-configs";

export const assessMeetingsRisk = createProductivityRiskAssessor(MEETINGS_CONFIG);
