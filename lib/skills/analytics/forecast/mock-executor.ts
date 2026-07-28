/** Analytics Forecast — mock execution (RC4.6). */

import { buildMockExecutor } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";

export const executeFORECASTMock = buildMockExecutor(FORECAST_DEF);
