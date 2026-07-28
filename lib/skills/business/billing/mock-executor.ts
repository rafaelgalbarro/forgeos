/** ForgeOS Business Skills — Business Billing mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { BILLING_DEF } from "./types";

export const mockExecuteBilling = buildMockExecutor(BILLING_DEF);
