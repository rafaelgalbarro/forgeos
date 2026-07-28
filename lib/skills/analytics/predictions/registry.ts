/** Analytics Predictions — registry (RC4.6). */

import { buildRegistry } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export const PREDICTIONS_REGISTRY = buildRegistry(PREDICTIONS_DEF);
