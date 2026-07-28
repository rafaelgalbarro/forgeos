/** ForgeOS Marketing Automation — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { AUTOMATION_CONFIG } from "./registry";

export function dispatchAutomationToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(AUTOMATION_CONFIG, params);
}
