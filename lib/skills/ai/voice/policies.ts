/** ForgeOS AI voice capability — policies (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(VOICE_CONFIG);
