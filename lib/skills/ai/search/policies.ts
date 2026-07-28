/** ForgeOS AI search capability — policies (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(SEARCH_CONFIG);
