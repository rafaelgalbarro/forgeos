/** ForgeOS Productivity Meetings — policies (RC4.3). */

import { createProductivityPolicy } from "../create-provider";
import { MEETINGS_CONFIG } from "../provider-configs";

export const MEETINGS_POLICY = createProductivityPolicy(MEETINGS_CONFIG);
