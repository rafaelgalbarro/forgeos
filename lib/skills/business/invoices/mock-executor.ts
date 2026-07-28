/** ForgeOS Business Skills — Business Invoices mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { INVOICES_DEF } from "./types";

export const mockExecuteInvoices = buildMockExecutor(INVOICES_DEF);
