/** ForgeOS Business Skills — Business Payments adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";
import { mockExecutePayments } from "./mock-executor";

export const executePaymentsViaRuntime = buildAdapter(
  PAYMENTS_DEF,
  mockExecutePayments
);
