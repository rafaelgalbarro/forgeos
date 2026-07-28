/** ForgeOS Marketing Content — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { CONTENT_CONFIG } from "./registry";

export function dispatchContentToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(CONTENT_CONFIG, params);
}
