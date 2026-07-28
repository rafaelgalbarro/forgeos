/** ForgeOS AI audio capability — policies (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(AUDIO_CONFIG);
