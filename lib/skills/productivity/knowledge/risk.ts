/** ForgeOS Productivity Knowledge — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { KNOWLEDGE_CONFIG } from "../provider-configs";

export const assessKnowledgeRisk = createProductivityRiskAssessor(KNOWLEDGE_CONFIG);
