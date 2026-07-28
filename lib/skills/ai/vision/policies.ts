/** ForgeOS AI vision capability — policies (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(VISION_CONFIG);
