/** ForgeOS AI reasoning capability — policies (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(REASONING_CONFIG);
