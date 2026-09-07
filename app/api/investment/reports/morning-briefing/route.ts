import { NextRequest, NextResponse } from "next/server";
import {
  listMorningBriefingHistory,
  loadMorningBriefingDocument,
  runMorningBriefing,
  MORNING_BRIEFING_TYPE,
} from "@/lib/investment/morning-briefing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET — list Morning Briefing history (append-only) or load one by ?id=
 * POST — generate a new Morning Briefing (ANALYSIS_ONLY, no orders).
 *
 * Type: morning-briefing (distinct from any future daily report).
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const doc = loadMorningBriefingDocument(id);
      if (!doc) {
        return NextResponse.json(
          { error: "NO_DATA", id, type: MORNING_BRIEFING_TYPE },
          { status: 404 },
        );
      }
      return NextResponse.json({
        ...doc,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
      });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 50;
    const history = listMorningBriefingHistory({
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json({
      type: MORNING_BRIEFING_TYPE,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      count: history.length,
      history,
      note: "Append-only Morning Briefing history under .forgeos/reports/",
    });
  } catch (error) {
    return NextResponse.json(
      {
        type: MORNING_BRIEFING_TYPE,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        history: [],
        error: error instanceof Error ? error.message : "History read failed",
      },
      { status: 200 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Optional body: { skipEmailSend?: boolean }
    let skipEmailSend = false;
    try {
      const body = (await request.json()) as { skipEmailSend?: boolean };
      skipEmailSend = body?.skipEmailSend === true;
    } catch {
      // empty body OK
    }

    const result = await runMorningBriefing({ skipEmailSend });

    return NextResponse.json({
      ok: true,
      type: MORNING_BRIEFING_TYPE,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      id: result.document.id,
      generatedAt: result.document.generatedAt,
      briefingDate: result.document.briefingDate,
      emailStatus: result.emailStatus,
      pdfRelativePath: result.historyEntry.pdfRelativePath,
      jsonRelativePath: result.historyEntry.jsonRelativePath,
      sections: result.document.sections.map((s) => ({
        id: s.id,
        title: s.title,
        state: s.state,
        lineCount: s.lines.length,
      })),
      note: result.note,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        type: MORNING_BRIEFING_TYPE,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        error: error instanceof Error ? error.message : "Morning briefing generation failed",
      },
      { status: 500 },
    );
  }
}
