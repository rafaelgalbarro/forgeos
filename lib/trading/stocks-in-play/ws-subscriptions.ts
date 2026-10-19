import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";

function normalizeUsSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  const dot = s.indexOf(".");
  return dot > 0 ? s.slice(0, dot) : s;
}

export function composeEodhdWsSubscriptionList(params: {
  pendingPremarket: readonly string[];
  fixedUniverse: readonly string[];
  inPlay: readonly string[];
  cycleCandidates: readonly string[];
  runners?: readonly string[];
  max: number;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const symbol = normalizeUsSymbol(raw);
    if (!symbol || seen.has(symbol) || isEuropeanEurEquity(symbol)) return;
    seen.add(symbol);
    out.push(symbol);
  };
  const runnerSet = new Set((params.runners ?? []).map(normalizeUsSymbol));

  for (const raw of params.pendingPremarket) {
    push(raw);
    if (out.length >= params.max) return out;
  }
  for (const raw of params.fixedUniverse) {
    push(raw);
    if (out.length >= params.max) return out;
  }
  for (const raw of params.inPlay) {
    push(raw);
    if (out.length >= params.max) return out;
  }
  for (const raw of params.cycleCandidates) {
    if (runnerSet.has(normalizeUsSymbol(raw))) continue;
    push(raw);
    if (out.length >= params.max) return out;
  }
  for (const raw of params.runners ?? []) {
    push(raw);
    if (out.length >= params.max) return out;
  }
  return out;
}
