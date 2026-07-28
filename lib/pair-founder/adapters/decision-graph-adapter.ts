/** Thin adapter — AI Runtime decision graph (read-only write via public API). */

export async function recordDecisionInGraph(params: {
  ventureId: string;
  title: string;
  rationale: string;
  confidence: number;
}): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const { writeRuntimeDecision } = await import("@/lib/ai-runtime/decision-graph");
    return writeRuntimeDecision({
      ventureId: params.ventureId,
      task: "ceo",
      output: `${params.title}: ${params.rationale}`,
      confidence: params.confidence,
    });
  } catch {
    return undefined;
  }
}

export async function getDecisionGraphAvailable(): Promise<boolean> {
  try {
    await import("@/lib/ai-runtime/decision-graph");
    return true;
  } catch {
    return false;
  }
}
