/** Analytics Metrics — runtime adapter (RC4.6). */

import { buildAdapter } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";
import { executeMETRICSMock } from "./mock-executor";

export const executeMETRICSViaRuntime = buildAdapter(METRICS_DEF, executeMETRICSMock);
