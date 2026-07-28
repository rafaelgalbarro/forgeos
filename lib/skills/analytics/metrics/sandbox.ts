/** Analytics Metrics — sandbox config (RC4.6). */

import { buildSandbox } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export const METRICS_SANDBOX = buildSandbox(METRICS_DEF);
