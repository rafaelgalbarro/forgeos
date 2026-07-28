/** Analytics Predictions — runtime adapter (RC4.6). */

import { buildAdapter } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";
import { executePREDICTIONSMock } from "./mock-executor";

export const executePREDICTIONSViaRuntime = buildAdapter(PREDICTIONS_DEF, executePREDICTIONSMock);
