/** Analytics Dashboards — mock execution (RC4.6). */

import { buildMockExecutor } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";

export const executeDASHBOARDSMock = buildMockExecutor(DASHBOARDS_DEF);
