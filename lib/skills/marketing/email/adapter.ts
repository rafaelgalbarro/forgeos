/** ForgeOS Marketing Email — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { EMAIL_CONFIG } from "./registry";

export function dispatchEmailToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(EMAIL_CONFIG, params);
}
