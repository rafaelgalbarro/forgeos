/** ForgeOS Productivity Messaging — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { MESSAGING_CONFIG } from "../provider-configs";

export const buildMessagingRollback = createProductivityRollbackBuilder(MESSAGING_CONFIG);
