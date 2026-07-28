/** Program 3000 Sprint 4 — AI Control Center public API. */

export { buildControlPanelSnapshot } from "./control-panel";
export {
  canActivateRealAi,
  getActivationStatus,
  getDesignPartnerEnvSummary,
  hasExplicitProviderKeys,
  isDesignPartnerMode,
  isRealAiEnabled,
  isRealAiFlagEnabled,
} from "./design-partner-gate";
export {
  checkAllConfiguredProvidersHealth,
  checkPrimaryProvidersHealth,
  checkProviderHealth,
  SPRINT4_PRIMARY_PROVIDERS,
} from "./provider-health";
export type {
  AiActivationMode,
  AiControlPanelSnapshot,
  FallbackChainSnapshot,
  ProviderHealthSnapshot,
  RealAiActivationStatus,
} from "./types";
