/** ForgeOS Business Skills — Business Payments mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";

export const mockExecutePayments = buildMockExecutor(PAYMENTS_DEF);
