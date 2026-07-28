/** Read-only adapter — AI Runtime public API. */

export interface AiRuntimeHints {
  realAiEnabled: boolean;
  telemetryAvailable: boolean;
}

export async function getAiRuntimeHints(): Promise<AiRuntimeHints> {
  try {
    const { isRealAiEnabled } = await import("@/lib/ai-runtime/config");
    return { realAiEnabled: isRealAiEnabled(), telemetryAvailable: true };
  } catch {
    return { realAiEnabled: false, telemetryAvailable: false };
  }
}

export async function getTelemetrySummarySafe(): Promise<{ totalCalls: number } | null> {
  try {
    const { getTelemetrySummary } = await import("@/lib/ai-runtime/telemetry/v2");
    const summary = getTelemetrySummary();
    return { totalCalls: summary.requestCount ?? 0 };
  } catch {
    return null;
  }
}
