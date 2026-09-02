/**
 * Morning Briefing public surface — ANALYSIS_ONLY.
 */

export { MORNING_BRIEFING_TYPE } from "./morning-briefing.types";
export type {
  BriefingLine,
  MorningBriefingDocument,
  MorningBriefingEmailPayload,
  MorningBriefingEmailStatus,
  MorningBriefingHistoryEntry,
  MorningBriefingReportType,
  MorningBriefingRunResult,
  MorningBriefingSection,
} from "./morning-briefing.types";

export {
  MORNING_BRIEFING_TIMEZONE,
  buildMorningBriefingDocument,
} from "./morning-briefing-builder";

export {
  renderMorningBriefingPdf,
  renderMorningBriefingPlainText,
  renderMorningBriefingHtml,
} from "./morning-briefing-pdf";

export {
  DEFAULT_BRIEFING_EMAIL_TO,
  resolveMorningBriefingMailConfig,
  buildMorningBriefingEmailPayload,
  sendMorningBriefingEmail,
} from "./morning-briefing-mailer";

export {
  REPORTS_ROOT_REL,
  MORNING_BRIEFING_DIR_REL,
  HISTORY_JSONL_REL,
  getMorningBriefingReportsRoot,
  getReportsHistoryPath,
  buildMorningBriefingId,
  persistMorningBriefing,
  listMorningBriefingHistory,
  loadMorningBriefingDocument,
} from "./morning-briefing-storage";

export { runMorningBriefing } from "./morning-briefing-runner";
export type { RunMorningBriefingOptions } from "./morning-briefing-runner";
