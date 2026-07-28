/** Analytics Predictions — mock execution (RC4.6). */

import { buildMockExecutor } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export const executePREDICTIONSMock = buildMockExecutor(PREDICTIONS_DEF);
