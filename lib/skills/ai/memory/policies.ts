/** ForgeOS AI memory capability — policies (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(MEMORY_CONFIG);
