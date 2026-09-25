const NO_DATA = "NO_DATA";

export function noData(): typeof NO_DATA {
  return NO_DATA;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseTagNumber(tag?: { value: string; currency: string } | null): number | null {
  if (!tag?.value) return null;
  const n = Number(tag.value);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(
  tag?: { value: string; currency: string } | null,
  fallback: string = NO_DATA,
): string {
  const n = parseTagNumber(tag);
  if (n == null) return fallback;
  const ccy = tag?.currency?.trim() || "";
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${ccy ? ` ${ccy}` : ""}`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(value)) return NO_DATA;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatQty(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return NO_DATA;
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function formatPct(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return NO_DATA;
  return `${value.toFixed(2)}%`;
}

export function formatOptional(value: string | number | boolean | null | undefined): string {
  if (value == null || value === "") return NO_DATA;
  if (typeof value === "boolean") return value ? "YES" : "NO";
  return String(value);
}

/** Prefer explicit optional field; never invent from avgCost. */
export function optionalMarketField(value: number | null | undefined): string {
  return isFiniteNumber(value) ? formatNumber(value, 4) : NO_DATA;
}

export function sumTagValues(
  account: Record<string, Record<string, { value: string; currency: string }>> | null,
  tag: string,
): { total: number | null; currency: string } {
  if (!account) return { total: null, currency: "" };
  let sum = 0;
  let count = 0;
  let currency = "";
  for (const tags of Object.values(account)) {
    const n = parseTagNumber(tags[tag]);
    if (n == null) continue;
    sum += n;
    count += 1;
    currency = tags[tag]?.currency || currency;
  }
  return { total: count > 0 ? sum : null, currency };
}
