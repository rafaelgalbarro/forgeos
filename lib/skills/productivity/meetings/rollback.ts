/** ForgeOS Productivity Meetings — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { MEETINGS_CONFIG } from "../provider-configs";

export const buildMeetingsRollback = createProductivityRollbackBuilder(MEETINGS_CONFIG);
