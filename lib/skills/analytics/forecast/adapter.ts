/** Analytics Forecast — runtime adapter (RC4.6). */

import { buildAdapter } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";
import { executeFORECASTMock } from "./mock-executor";

export const executeFORECASTViaRuntime = buildAdapter(FORECAST_DEF, executeFORECASTMock);
