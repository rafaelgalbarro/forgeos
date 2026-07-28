/** ForgeOS AI reasoning capability — adapter via AI Runtime (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

let cachedRouteViaAdapter: ReturnType<typeof buildAdapter> | null = null;

function getRouteViaAdapter() {
  if (!cachedRouteViaAdapter) {
    const mockExecutor = buildMockExecutor(REASONING_CONFIG);
    cachedRouteViaAdapter = buildAdapter(REASONING_CONFIG, mockExecutor);
  }
  return cachedRouteViaAdapter;
}

export const routeViaAdapter = (
  params: Parameters<ReturnType<typeof buildAdapter>>[0]
) => getRouteViaAdapter()(params);
