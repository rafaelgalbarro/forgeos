/** Analytics Predictions — policies (RC4.6). */

import { buildPolicies } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export const PREDICTIONS_POLICIES = buildPolicies(PREDICTIONS_DEF);
