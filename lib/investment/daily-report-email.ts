/**
 * Email delivery stub for daily investment reports.
 * Phase 1: never sends. Gate with INVESTMENT_REPORT_EMAIL_ENABLED=false (default).
 */

import type { ReportEmailDeliveryStatus } from "@/lib/investment/reports-types";

export type DailyReportEmailPayload = {
  readonly reportId: string;
  readonly periodKey: string;
  readonly generatedAt: string;
  readonly pdfPath: string | null;
  readonly htmlPath: string | null;
  readonly subject?: string;
  readonly to?: string;
};

/**
 * Prepare / optionally send the daily report email.
 * When INVESTMENT_REPORT_EMAIL_ENABLED is not "true", returns sent:false without transport.
 */
export async function sendDailyReportEmail(
  payload: DailyReportEmailPayload,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReportEmailDeliveryStatus> {
  const enabled = String(env.INVESTMENT_REPORT_EMAIL_ENABLED ?? "false").toLowerCase() === "true";

  if (!enabled) {
    return {
      attempted: false,
      sent: false,
      enabled: false,
      reason:
        "INVESTMENT_REPORT_EMAIL_ENABLED=false — email delivery stubbed for later phase (report saved to disk only)",
    };
  }

  // Future phase: wire SMTP/provider using INVESTMENT_REPORT_EMAIL_TO etc.
  // Still do not invent a successful send without a real transport.
  void payload;
  return {
    attempted: true,
    sent: false,
    enabled: true,
    reason:
      "Email transport not implemented yet — report persisted; enable flag alone does not send mail",
  };
}
