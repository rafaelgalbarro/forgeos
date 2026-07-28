/** ForgeOS AI video capability — policies (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(VIDEO_CONFIG);
