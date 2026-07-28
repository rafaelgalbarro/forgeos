/** ForgeOS Business Skills — Business ERP mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { ERP_DEF } from "./types";

export const mockExecuteErp = buildMockExecutor(ERP_DEF);
