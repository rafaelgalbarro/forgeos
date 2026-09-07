import { NextResponse } from "next/server";
import { runResearchOrchestrator } from "@/lib/investment/research/snapshot";
import {
  listResearchMemoryEntries,
  readResearchMemoryIndex,
} from "@/lib/investment/research";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY = {
  mode: "ANALYSIS_ONLY" as const,
  orderExecution: "disabled" as const,
  liveTradingEnabled: false as const,
  ibkrReadOnly: true as const,
};

/**
 * GET /api/investment/research
 * Query:
 *   - view=status|dashboard|dossier|scores|memory (default dashboard)
 *   - symbols=AAPL,MSFT
 *   - symbol=AAPL (dossier/scores)
 *   - persist=1 (append research memory)
 *   - refresh=1 (skip cache)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const view = (url.searchParams.get("view") ?? "dashboard").toLowerCase();
    const symbolsParam = url.searchParams.get("symbols");
    const symbolParam = url.searchParams.get("symbol");
    const symbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : symbolParam
        ? [symbolParam]
        : undefined;
    const persistMemory = url.searchParams.get("persist") === "1";
    const skipCache = url.searchParams.get("refresh") === "1";

    if (view === "memory") {
      const index = readResearchMemoryIndex();
      const entries = listResearchMemoryEntries({
        symbol: symbolParam ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? 30) || 30,
      });
      return NextResponse.json({
        ...SAFETY,
        view: "memory",
        index,
        entries,
        count: entries.length,
        note: "Append-only research memory — prior versions never mutated.",
      });
    }

    const snapshot = await runResearchOrchestrator({
      symbols,
      persistMemory,
      skipCache,
    });

    if (view === "status") {
      return NextResponse.json({
        ...SAFETY,
        view: "status",
        generatedAt: snapshot.generatedAt,
        engines: snapshot.engines,
        providersNote: snapshot.note,
        memoryCount: snapshot.memoryCount,
        integrations: snapshot.integrations,
        cacheHit: snapshot.cacheHit,
      });
    }

    if (view === "dossier") {
      const sym = (symbolParam ?? symbols?.[0] ?? "").toUpperCase();
      const dossier =
        snapshot.dossiers.find((d) => d.symbol === sym) ?? snapshot.dossiers[0] ?? null;
      return NextResponse.json({
        ...SAFETY,
        view: "dossier",
        dossier,
        note: dossier?.note ?? "NO_DATA",
      });
    }

    if (view === "scores") {
      const sym = (symbolParam ?? symbols?.[0] ?? "").toUpperCase();
      const dossier =
        snapshot.dossiers.find((d) => d.symbol === sym) ?? snapshot.dossiers[0] ?? null;
      return NextResponse.json({
        ...SAFETY,
        view: "scores",
        symbol: dossier?.symbol ?? sym,
        scores: dossier?.scores ?? null,
        note: dossier ? "Composed from engine signals" : "NO_DATA",
      });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        ...SAFETY,
        ok: false,
        error: error instanceof Error ? error.message : "research_engine_failed",
        engines: [],
        dossiers: [],
        note: "Research Engine error — no fabricated data.",
      },
      { status: 500 },
    );
  }
}
