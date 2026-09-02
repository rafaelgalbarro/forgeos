import "server-only";

/**
 * Outbound JSON webhook export (Google Sheets Apps Script / Zapier / generic).
 * Set FORGEOS_SHEETS_WEBHOOK_URL or FORGEOS_EXPORT_WEBHOOK_URL.
 * No-op when unset. Never places orders.
 */

export type WebhookExportEvent =
  | "daily_report"
  | "cycle_complete"
  | "manual";

export type WebhookExportPayload = {
  readonly source: "forgeos-investment";
  readonly event: WebhookExportEvent;
  readonly at: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly data: unknown;
};

function resolveWebhookUrl(): string | undefined {
  const sheets = process.env.FORGEOS_SHEETS_WEBHOOK_URL?.trim();
  if (sheets) return sheets;
  const generic = process.env.FORGEOS_EXPORT_WEBHOOK_URL?.trim();
  return generic || undefined;
}

export function isWebhookExportConfigured(): boolean {
  return Boolean(resolveWebhookUrl());
}

/**
 * POST JSON to the configured webhook. Returns skipped when URL unset.
 * Failures are logged and never throw to callers (report/cycle must not break).
 */
export async function exportToWebhook(
  event: WebhookExportEvent,
  data: unknown,
): Promise<{ ok: boolean; skipped: boolean; status?: number; error?: string }> {
  const url = resolveWebhookUrl();
  if (!url) {
    return { ok: true, skipped: true };
  }

  const payload: WebhookExportPayload = {
    source: "forgeos-investment",
    event,
    at: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    data,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        `[WebhookExport] ${event} → HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
      return { ok: false, skipped: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, skipped: false, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[WebhookExport] ${event} failed:`, message);
    return { ok: false, skipped: false, error: message };
  }
}

/** Subscribe helper for cycle_complete — call once from instrumentation. */
export function startWebhookExportListener(): () => void {
  if (!isWebhookExportConfigured()) {
    return () => undefined;
  }
  // Dynamic import keeps this file usable from scripts without requiring events module at load.
  let unsubscribe: (() => void) | undefined;
  void import("@/lib/notifications/investment-events").then(({ subscribeInvestmentEvents }) => {
    unsubscribe = subscribeInvestmentEvents((event) => {
      if (event.type !== "cycle_complete") return;
      void exportToWebhook("cycle_complete", event.payload);
    });
  });
  return () => {
    unsubscribe?.();
  };
}
