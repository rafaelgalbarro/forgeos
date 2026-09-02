/**
 * Morning Briefing contracts — ANALYSIS_ONLY, no order path.
 * Type `morning-briefing` is distinct from any future `daily` report.
 */

export const MORNING_BRIEFING_TYPE = "morning-briefing" as const;
export type MorningBriefingReportType = typeof MORNING_BRIEFING_TYPE;

export type MorningBriefingEmailStatus =
  | "SENT"
  | "QUEUED"
  | "SKIPPED_NO_SMTP"
  | "SKIPPED_DISABLED"
  | "FAILED";

export type BriefingLine = {
  readonly text: string;
  /** Provenance / availability — never invent market facts. */
  readonly state: "READY" | "NO_DATA" | "PARTIAL";
};

export type MorningBriefingSection = {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly state: "READY" | "NO_DATA" | "PARTIAL";
  readonly lines: readonly BriefingLine[];
  readonly source: string;
};

export type MorningBriefingDocument = {
  readonly id: string;
  readonly type: MorningBriefingReportType;
  readonly generatedAt: string;
  /** Calendar date in schedule timezone (YYYY-MM-DD). */
  readonly briefingDate: string;
  readonly scheduleTimezone: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly title: string;
  readonly subtitle: string;
  readonly sections: readonly MorningBriefingSection[];
  readonly sourcesUsed: readonly string[];
  readonly note: string;
};

export type MorningBriefingHistoryEntry = {
  readonly id: string;
  readonly type: MorningBriefingReportType;
  readonly generatedAt: string;
  readonly briefingDate: string;
  readonly pdfRelativePath: string;
  readonly jsonRelativePath: string;
  readonly emailStatus: MorningBriefingEmailStatus;
  readonly emailTo: string;
  readonly immutable: true;
};

export type MorningBriefingEmailPayload = {
  readonly to: string;
  readonly from: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly attachmentRelativePath: string;
  readonly briefingId: string;
  readonly generatedAt: string;
};

export type MorningBriefingRunResult = {
  readonly document: MorningBriefingDocument;
  readonly historyEntry: MorningBriefingHistoryEntry;
  readonly pdfAbsolutePath: string;
  readonly jsonAbsolutePath: string;
  readonly emailStatus: MorningBriefingEmailStatus;
  readonly emailPayloadAbsolutePath: string | null;
  readonly note: string;
};
