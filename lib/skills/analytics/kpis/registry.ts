/** Analytics KPIs — registry (RC4.6). */

import { buildRegistry } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";

export const KPIS_REGISTRY = buildRegistry(KPIS_DEF);
