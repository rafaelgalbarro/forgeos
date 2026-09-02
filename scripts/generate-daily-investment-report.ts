/**
 * Cron-ready daily ForgeOS Investment PDF report generator.
 *
 * Usage (repo root):
 *   npx --yes tsx scripts/generate-daily-investment-report.ts
 *
 * Suggested cron (weekdays 17:00 local):
 *   0 17 * * 1-5 cd /path/to/ForgeOS_App_Factory_v0_1 && npx --yes tsx scripts/generate-daily-investment-report.ts
 *
 * Env:
 *   INVESTMENT_REPORT_EMAIL_ENABLED=false  (default — do not send mail)
 *
 * Output (append-only, never overwrites):
 *   .forgeos/reports/investment/daily/YYYY-MM-DDTHHMMSS-vN.pdf
 *   .forgeos/reports/investment/daily/YYYY-MM-DDTHHMMSS-vN.html
 *   .forgeos/reports/investment/documents/daily-….json
 *
 * ANALYSIS_ONLY — missing snapshots → NO_DATA; never invents live P&L.
 */

import Module from "node:module";

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
  const { generateDailyInvestmentReport } = await import(
    "../lib/investment/daily-report-generator"
  );
  const result = await generateDailyInvestmentReport({ refreshDashboard: true });
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        id: result.report.id,
        periodKey: result.report.periodKey,
        version: result.report.version,
        pdfPath: result.pdfPath,
        htmlPath: result.htmlPath,
        jsonPath: result.jsonPath,
        email: result.report.email,
        mode: "ANALYSIS_ONLY",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
