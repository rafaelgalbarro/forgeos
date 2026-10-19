import "server-only";

import { isEodhdConfigured } from "@/lib/market-data/eodhd";

export async function loadEarningsSymbolsForDay(dayKey: string): Promise<Set<string>> {
  const key = process.env.EODHD_API_KEY?.trim() ?? "";
  if (!key || !isEodhdConfigured()) return new Set();
  const base = (process.env.EODHD_BASE_URL ?? "https://eodhd.com/api").replace(/\/$/, "");
  const url =
    `${base}/calendar/earnings?from=${encodeURIComponent(dayKey)}` +
    `&to=${encodeURIComponent(dayKey)}&api_token=${encodeURIComponent(key)}&fmt=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return new Set();
    const json = (await res.json()) as { earnings?: Array<{ code?: string }> };
    const out = new Set<string>();
    for (const row of json.earnings ?? []) {
      const code = String(row.code ?? "").trim().toUpperCase().replace(/\.US$/i, "");
      if (code) out.add(code);
    }
    return out;
  } catch {
    return new Set();
  }
}
