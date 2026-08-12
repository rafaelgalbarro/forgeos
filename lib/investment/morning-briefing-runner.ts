/**
 * Morning Briefing runner — build → PDF → persist (immutable) → email (best-effort).
 * ANALYSIS_ONLY — never places orders.
 */

import {
  buildMorningBriefingDocument,
  type BuildMorningBriefingOptions,
} from "./morning-briefing-builder";
import { renderMorningBriefingPdf } from "./morning-briefing-pdf";
import {
  sendMorningBriefingEmail,
  resolveMorningBriefingMailConfig,
  buildMorningBriefingEmailPayload,
} from "./morning-briefing-mailer";
import { persistMorningBriefing } from "./morning-briefing-storage";
import type {
  MorningBriefingEmailStatus,
  MorningBriefingRunResult,
} from "./morning-briefing.types";

export type RunMorningBriefingOptions = BuildMorningBriefingOptions & {
  readonly cwd?: string;
  /** When true, skip SMTP attempt entirely (still writes email-payload.json). */
  readonly skipEmailSend?: boolean;
};

/**
 * Generate one Morning Briefing, save under `.forgeos/reports/morning-briefing/`,
 * append history.jsonl, and attempt email without failing the run.
 */
export async function runMorningBriefing(
  options: RunMorningBriefingOptions = {},
): Promise<MorningBriefingRunResult> {
  const document = await buildMorningBriefingDocument(options);
  const pdfBytes = renderMorningBriefingPdf(document);
  const mailConfig = resolveMorningBriefingMailConfig();

  const provisionalRelative = `.forgeos/reports/morning-briefing/${document.id.replace(/^morning-briefing-/, "")}/morning-briefing.pdf`
    .split("\\")
    .join("/");

  let emailStatus: MorningBriefingEmailStatus;
  let emailDetail: string;
  let emailPayload = buildMorningBriefingEmailPayload(
    document,
    provisionalRelative,
    mailConfig,
  );

  if (options.skipEmailSend) {
    emailStatus = mailConfig.enabled
      ? mailConfig.smtpHost
        ? "QUEUED"
        : "SKIPPED_NO_SMTP"
      : "SKIPPED_DISABLED";
    emailDetail = "skipEmailSend=true — payload recorded only";
  } else {
    const emailResult = await sendMorningBriefingEmail({
      document,
      pdfRelativePath: provisionalRelative,
      pdfBytes,
    });
    emailStatus = emailResult.status;
    emailPayload = emailResult.payload;
    emailDetail = emailResult.detail;
  }

  const persisted = persistMorningBriefing({
    document,
    pdfBytes,
    emailStatus,
    emailTo: mailConfig.to,
    emailPayload,
    cwd: options.cwd,
  });

  return {
    document,
    historyEntry: persisted.historyEntry,
    pdfAbsolutePath: persisted.pdfAbsolutePath,
    jsonAbsolutePath: persisted.jsonAbsolutePath,
    emailStatus,
    emailPayloadAbsolutePath: persisted.emailPayloadAbsolutePath,
    note: `Morning briefing saved. emailStatus=${emailStatus}. ${emailDetail}`,
  };
}
