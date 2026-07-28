/** ForgeOS Productivity Email — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { EMAIL_CONFIG } from "../provider-configs";

export const assessEmailRisk = createProductivityRiskAssessor(EMAIL_CONFIG);
