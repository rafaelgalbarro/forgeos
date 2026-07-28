/** Analytics Metrics — mock execution (RC4.6). */

import { buildMockExecutor } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export const executeMETRICSMock = buildMockExecutor(METRICS_DEF);
