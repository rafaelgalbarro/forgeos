/** Analytics Predictions — sandbox config (RC4.6). */

import { buildSandbox } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export const PREDICTIONS_SANDBOX = buildSandbox(PREDICTIONS_DEF);
