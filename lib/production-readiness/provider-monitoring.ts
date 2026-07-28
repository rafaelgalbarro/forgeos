/** Program 6500 — AI provider health (reuses lib/ai-control/provider-health) */

export {
  checkProviderHealth,
  checkPrimaryProvidersHealth,
  checkAllConfiguredProvidersHealth,
  SPRINT4_PRIMARY_PROVIDERS,
} from "@/lib/ai-control/provider-health";

export type { ProviderHealthSnapshot } from "@/lib/ai-control/types";
