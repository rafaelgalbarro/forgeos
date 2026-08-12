/**
 * Shared HTTP helpers for Market Intelligence adapters.
 * Never invents quotes — callers must return [] on missing keys / HTTP errors.
 */

export type JsonFetcher = (url: string, init?: RequestInit) => Promise<unknown>;

export function createDefaultJsonFetcher(timeoutMs = 8_000): JsonFetcher {
  return async (url, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  };
}

export function requireApiKey(key: string | undefined, providerId: string): string {
  const trimmed = key?.trim();
  if (!trimmed) {
    throw new Error(`${providerId}: API key missing — refusing to invent quotes`);
  }
  return trimmed;
}

/** Map vendor ticker type strings to coarse assetClass when the provider supplies them. */
export function mapVendorAssetClass(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "cs" || v === "common stock" || v === "equity" || v === "stock") return "equity";
  if (v === "etf" || v.includes("etf")) return "etf";
  if (v === "adr") return "equity";
  if (v.includes("forex") || v === "fx" || v === "currency") return "forex";
  if (v.includes("crypto")) return "crypto";
  if (v.includes("future") || v === "fut") return "futures";
  if (v.includes("option") || v === "opt") return "options";
  if (v.includes("bond") || v.includes("fixed")) return "bonds";
  if (v.includes("index") || v === "ind") return "indices";
  if (v.includes("commodity")) return "commodities";
  return v;
}

export function closesToPeriodReturns(closes: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const cur = closes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(cur) || prev === 0) continue;
    out.push((cur - prev) / prev);
  }
  return out;
}
