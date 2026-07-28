/** PROGRAM 6000 — Digital CEO public API. */

export type * from "./types";
export { DIGITAL_CEO_VERSION, DIGITAL_CEO_STORAGE_PREFIX } from "./types";

export {
  readDigitalCEOState,
  writeDigitalCEOState,
  todayDateKey,
  lastMondayDateKey,
  isMorningBriefStale,
  isWeeklyReviewStale,
} from "./digital-ceo-persistence";

export { generateMorningBrief, formatMorningBriefText } from "./morning-brief";
export { generateMissionBrief, formatMissionBriefText } from "./mission-brief";
export { generateCEOBrief, formatCEOBriefText } from "./ceo-brief";
export { generateDailyPriorities, formatDailyPrioritiesReminder } from "./daily-priorities";
export { generateWeeklyReview, formatWeeklyReviewText } from "./weekly-review";
export { generateExecutiveDigest, formatExecutiveDigestText } from "./executive-digest";
export { composeAllBriefs, buildOpeningMessage } from "./brief-generator";

export {
  generateDigitalCEOBriefs,
  refreshDigitalCEOState,
  dismissDigitalCEO,
  getDigitalCEOSnapshotForMission,
} from "./digital-ceo-orchestrator";

export {
  isReturningMission,
  runProactiveSessionStart,
  applyProactiveInitToMission,
  startMissionSession,
} from "./proactive-init";

export {
  buildEmptyDigitalCEOSnapshot,
  buildDigitalCEOSnapshotFromState,
  digitalCEOSnapshotSummary,
} from "./digital-ceo-snapshots";
export type { DigitalCEOSnapshot } from "./digital-ceo-snapshots";
