/** Thin adapter — AI Runtime model router (public exports only). */

export async function getCeoRoutingHint(): Promise<{ provider: string; model: string } | null> {
  try {
    const { routeModel } = await import("@/lib/ai-runtime/router");
    const decision = routeModel({ task: "ceo", optimizer: "balanced" });
    return { provider: decision.selectedProvider, model: decision.selectedModel };
  } catch {
    return null;
  }
}

export async function isRealAiAvailable(): Promise<boolean> {
  try {
    const { isRealAiEnabled } = await import("@/lib/ai-runtime/config");
    return isRealAiEnabled();
  } catch {
    return false;
  }
}
