/** Analytics Dashboards — registry (RC4.6). */

import { buildRegistry } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";

export const DASHBOARDS_REGISTRY = buildRegistry(DASHBOARDS_DEF);
