/** Analytics Metrics — registry (RC4.6). */

import { buildRegistry } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export const METRICS_REGISTRY = buildRegistry(METRICS_DEF);
