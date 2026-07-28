/** ForgeOS AI video capability — adapter via AI Runtime (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(VIDEO_CONFIG);
export const routeViaAdapter = buildAdapter(VIDEO_CONFIG, mockExecutor);
