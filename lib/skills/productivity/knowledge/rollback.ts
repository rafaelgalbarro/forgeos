/** ForgeOS Productivity Knowledge — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { KNOWLEDGE_CONFIG } from "../provider-configs";

export const buildKnowledgeRollback = createProductivityRollbackBuilder(KNOWLEDGE_CONFIG);
