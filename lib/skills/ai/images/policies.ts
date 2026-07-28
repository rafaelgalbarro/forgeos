/** ForgeOS AI images capability — policies (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(IMAGES_CONFIG);
