/**
 * Generate ForgeOS Investment Morning Briefing PDF (pre-market-open cron).
 *
 * Timezone assumption: Europe/Madrid
 * Recommended schedule: 08:00 Mon–Fri before EU cash open
 *   cron (Linux):  0 8 * * 1-5
 *   with TZ=Europe/Madrid (or system clock in that zone)
 *
 * US equity cash open is ~15:30 Madrid (winter) / ~14:30 (US DST).
 * This script is ANALYSIS_ONLY — never places orders.
 *
 * Usage:
 *   npx --yes tsx scripts/generate-morning-briefing.ts
 *   npm run investment:morning-briefing
 *
 * Env:
 *   INVESTMENT_BRIEFING_EMAIL_TO      (default rafaelgalbarro@gmail.com)
 *   INVESTMENT_BRIEFING_EMAIL_ENABLED (true to attempt SMTP)
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
 *
 * If SMTP is missing, PDF is still saved and emailStatus=SKIPPED_NO_SMTP|QUEUED.
 */

import Module from "node:module";

// Scripts run outside Next — stub server-only packages used by investment libs.
const moduleLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === "server-only") return {};
  return moduleLoad(request, parent, isMain);
};

async function main(): Promise<void> {
  const { runMorningBriefing, MORNING_BRIEFING_TIMEZONE } = await import(
    "../lib/investment/morning-briefing"
  );

  console.log(`[morning-briefing] Generating (timezone=${MORNING_BRIEFING_TIMEZONE})…`);
  const result = await runMorningBriefing();

  console.log(`[morning-briefing] id=${result.document.id}`);
  console.log(`[morning-briefing] date=${result.document.briefingDate}`);
  console.log(`[morning-briefing] pdf=${result.pdfAbsolutePath}`);
  console.log(`[morning-briefing] json=${result.jsonAbsolutePath}`);
  console.log(`[morning-briefing] emailStatus=${result.emailStatus}`);
  console.log(`[morning-briefing] emailTo=${result.historyEntry.emailTo}`);
  if (result.emailPayloadAbsolutePath) {
    console.log(`[morning-briefing] emailPayload=${result.emailPayloadAbsolutePath}`);
  }
  console.log(`[morning-briefing] sections=${result.document.sections.length}`);
  for (const s of result.document.sections) {
    console.log(`  - ${s.id}: ${s.state} (${s.lines.length} lines)`);
  }
  console.log(`[morning-briefing] ${result.note}`);
  console.log("[morning-briefing] ANALYSIS_ONLY — no orders.");
}

main().catch((error) => {
  console.error("[morning-briefing] FAILED", error);
  process.exitCode = 1;
});
