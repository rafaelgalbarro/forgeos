/** ForgeOS AI Gateway — response parsing helpers. */

export function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export function parseJSONResponse<T>(text: string): T {
  return JSON.parse(extractJSON(text)) as T;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  costPer1k: number
): number {
  return ((inputTokens + outputTokens) / 1000) * costPer1k;
}
