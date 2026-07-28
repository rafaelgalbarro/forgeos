/** ForgeOS Productivity Calendar — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { CALENDAR_CONFIG } from "../provider-configs";

export const assessCalendarRisk = createProductivityRiskAssessor(CALENDAR_CONFIG);
