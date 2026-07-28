/** ForgeOS Marketing Social — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { SOCIAL_CONFIG } from "./registry";

export function dispatchSocialToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(SOCIAL_CONFIG, params);
}
