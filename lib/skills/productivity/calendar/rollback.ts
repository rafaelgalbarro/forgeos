/** ForgeOS Productivity Calendar — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { CALENDAR_CONFIG } from "../provider-configs";

export const buildCalendarRollback = createProductivityRollbackBuilder(CALENDAR_CONFIG);
