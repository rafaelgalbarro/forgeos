/** Analytics Reports — mock execution (RC4.6). */

import { buildMockExecutor } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";

export const executeREPORTSMock = buildMockExecutor(REPORTS_DEF);
