/** Analytics Reports — runtime adapter (RC4.6). */

import { buildAdapter } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";
import { executeREPORTSMock } from "./mock-executor";

export const executeREPORTSViaRuntime = buildAdapter(REPORTS_DEF, executeREPORTSMock);
