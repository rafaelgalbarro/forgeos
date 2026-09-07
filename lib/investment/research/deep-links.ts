/**
 * Deep-link helpers for Research Engine dossiers.
 * Opportunities / Alpha / Committee can link without duplicating research logic.
 */

export function researchDossierHref(symbol: string): string {
  return `/investment/research?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`;
}

export function researchApiHref(options?: {
  readonly view?: "status" | "dashboard" | "dossier" | "scores" | "memory";
  readonly symbol?: string;
  readonly symbols?: readonly string[];
  readonly refresh?: boolean;
  readonly persist?: boolean;
}): string {
  const q = new URLSearchParams();
  if (options?.view) q.set("view", options.view);
  if (options?.symbol) q.set("symbol", options.symbol.toUpperCase());
  if (options?.symbols?.length) q.set("symbols", options.symbols.join(","));
  if (options?.refresh) q.set("refresh", "1");
  if (options?.persist) q.set("persist", "1");
  const qs = q.toString();
  return qs ? `/api/investment/research?${qs}` : "/api/investment/research";
}
