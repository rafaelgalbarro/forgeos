/** Program 3000 Sprint 4 — Design Partner AI gate. */

import {
  env,
  getRealAiActivationStatus,
  hasExplicitProviderKeys,
  isDesignPartnerMode,
  isRealAiEnabled,
  isRealAiFlagEnabled,
} from "@/lib/ai-runtime/config";
import type { RealAiActivationStatus } from "./types";

export {
  isRealAiEnabled,
  isRealAiFlagEnabled,
  isDesignPartnerMode,
  hasExplicitProviderKeys,
};

export function getActivationStatus(): RealAiActivationStatus {
  return getRealAiActivationStatus();
}

export function canActivateRealAi(): boolean {
  return isRealAiEnabled();
}

export function getDesignPartnerEnvSummary(): {
  enableDesignPartnerAi: boolean;
  designPartnerMode: boolean;
  configuredKeyNames: string[];
} {
  const keyNames = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"] as const;
  const configuredKeyNames: string[] = keyNames.filter((k) => Boolean(env(k))).slice();

  if (env("GOOGLE_AI_API_KEY") && !configuredKeyNames.includes("GEMINI_API_KEY")) {
    configuredKeyNames.push("GEMINI_API_KEY");
  }

  return {
    enableDesignPartnerAi: isDesignPartnerMode(),
    designPartnerMode: isDesignPartnerMode(),
    configuredKeyNames: [...configuredKeyNames],
  };
}
