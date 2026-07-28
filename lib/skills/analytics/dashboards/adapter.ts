/** Analytics Dashboards — runtime adapter (RC4.6). */

import { buildAdapter } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";
import { executeDASHBOARDSMock } from "./mock-executor";

export const executeDASHBOARDSViaRuntime = buildAdapter(DASHBOARDS_DEF, executeDASHBOARDSMock);
