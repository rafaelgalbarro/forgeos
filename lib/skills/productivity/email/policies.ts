/** ForgeOS Productivity Email — policies (RC4.3). */

import { createProductivityPolicy } from "../create-provider";
import { EMAIL_CONFIG } from "../provider-configs";

export const EMAIL_POLICY = createProductivityPolicy(EMAIL_CONFIG);
