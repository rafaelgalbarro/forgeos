/** ForgeOS Productivity Messaging — policies (RC4.3). */

import { createProductivityPolicy } from "../create-provider";
import { MESSAGING_CONFIG } from "../provider-configs";

export const MESSAGING_POLICY = createProductivityPolicy(MESSAGING_CONFIG);
