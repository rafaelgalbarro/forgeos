import { NextRequest, NextResponse } from "next/server";
import {
  executeCommitteeSales,
  getCommitteeAnalysis,
  runPortfolioCommitteeAnalysis,
} from "@/lib/investment/portfolio-committee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: "run" | "execute";
      analysisId?: string;
    };
    const action = body.action ?? "run";
    if (action === "execute") {
      if (!body.analysisId) {
        return NextResponse.json({ error: "analysisId required for execute" }, { status: 400 });
      }
      const result = await executeCommitteeSales(body.analysisId);
      return NextResponse.json({ ok: true, ...result });
    }
    const result = await runPortfolioCommitteeAnalysis();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "committee analysis failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("analysisId");
  if (!id) return NextResponse.json({ ok: false, error: "analysisId required" }, { status: 400 });
  const snapshot = getCommitteeAnalysis(id);
  if (!snapshot) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...snapshot });
}
