/**
 * Daily investment PDF reports API.
 *
 * GET  /api/investment/reports/daily — list immutable history (filters: limit, periodKey, q)
 * POST /api/investment/reports/daily — generate + append a new daily PDF/HTML report
 *
 * Cron-ready CLI twin:
 *   npx --yes tsx scripts/generate-daily-investment-report.ts
 *   npm run report:investment-daily
 *   # e.g. 0 17 * * 1-5  (weekdays 17:00) → run the script from repo root
 *
 * ANALYSIS_ONLY · never overwrites prior reports · email stubbed unless INVESTMENT_REPORT_EMAIL_ENABLED=true
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDailyInvestmentReport } from "@/lib/investment/daily-report-generator";
import { listReportItems, loadReport } from "@/lib/investment/reports-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get("id");
    if (id) {
      const doc = loadReport(id);
      if (!doc || doc.periodType !== "daily" || !doc.artifacts?.pdfPath) {
        return NextResponse.json(
          { error: "NO_DATA", mode: "ANALYSIS_ONLY", report: null },
          { status: 404 },
        );
      }
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        report: doc,
      });
    }

    const limitRaw = Number(sp.get("limit") ?? 30);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 30;
    const listed = listReportItems({
      periodType: "daily",
      periodKey: sp.get("periodKey") ?? undefined,
      q: sp.get("q") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      limit: 500,
    });

    // Prefer PDF-backed daily runs when mixed with period-center daily JSON-only docs
    const items = listed.items
      .filter((item) => Boolean(loadReport(item.id)?.artifacts?.pdfPath))
      .slice(0, limit);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      total: items.length,
      items,
      availablePeriodKeys: [...new Set(items.map((i) => i.periodKey))],
      note: "Append-only daily PDF history — PDF/HTML under .forgeos/reports/investment/daily/",
      emailEnabled: String(process.env.INVESTMENT_REPORT_EMAIL_ENABLED ?? "false"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily reports list failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        total: 0,
        items: [],
        availablePeriodKeys: [],
      },
      { status: 200 },
    );
  }
}

export async function POST() {
  try {
    const result = await generateDailyInvestmentReport();
    return NextResponse.json({
      ok: true,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      report: result.report,
      pdfPath: result.pdfPath,
      htmlPath: result.htmlPath,
      jsonPath: result.jsonPath,
      email: result.report.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily report generation failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
      },
      { status: 500 },
    );
  }
}
