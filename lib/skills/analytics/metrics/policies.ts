/** Analytics Metrics — policies (RC4.6). */

import { buildPolicies } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export const METRICS_POLICIES = buildPolicies(METRICS_DEF);
