/** ForgeOS Marketing Seo — runtime adapter (RC4.5). */

import { dispatchToRuntime } from "../shared/create-provider-module";
import { SEO_CONFIG } from "./registry";

export function dispatchSeoToRuntime(params: {
  ventureId: string;
  executionId: string;
  action: string;
}) {
  return dispatchToRuntime(SEO_CONFIG, params);
}
