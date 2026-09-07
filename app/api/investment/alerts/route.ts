import { NextResponse } from "next/server";
import {
  ALERT_TEMPLATES,
  addWatchlistTicker,
  createAlert,
  deleteAlert,
  evaluateAllAlerts,
  listAlertsSnapshot,
  removeWatchlistTicker,
  updateAlert,
} from "@/lib/alerts/alert-manager";
import type { AlertType } from "@/lib/alerts/alert-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("evaluate") === "1") {
    const results = await evaluateAllAlerts();
    return NextResponse.json({ evaluated: true, triggered: results.length, results });
  }
  const state = listAlertsSnapshot();
  return NextResponse.json({
    ...state,
    templates: ALERT_TEMPLATES,
    mode: "ANALYSIS_ONLY",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: "create_alert" | "add_watchlist" | "evaluate";
      type?: AlertType;
      ticker?: string;
      label?: string;
      params?: Record<string, unknown>;
      note?: string;
    };

    if (body.action === "evaluate") {
      const results = await evaluateAllAlerts();
      return NextResponse.json({ ok: true, triggered: results.length, results });
    }

    if (body.action === "add_watchlist" && body.ticker) {
      const entry = addWatchlistTicker(body.ticker, body.note);
      return NextResponse.json({ ok: true, entry });
    }

    if (body.action === "create_alert" && body.type && body.ticker && body.label) {
      const rule = createAlert({
        type: body.type,
        ticker: body.ticker,
        label: body.label,
        params: (body.params ?? {}) as AlertRuleParams,
      });
      return NextResponse.json({ ok: true, alert: rule });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Alert API failed" },
      { status: 500 },
    );
  }
}

type AlertRuleParams = {
  operator?: "below" | "above" | "crosses";
  value?: number;
  indicator?: "rsi";
  patternName?: string;
  volumeMultiplier?: number;
  minScore?: number;
  minInsiderUsd?: number;
  minGapPct?: number;
};

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { id?: string; enabled?: boolean; label?: string; params?: AlertRuleParams };
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const updated = updateAlert(body.id, body);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, alert: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const ticker = url.searchParams.get("ticker");
  const watchlist = url.searchParams.get("watchlist") === "1";

  if (watchlist && ticker) {
    removeWatchlistTicker(ticker);
    return NextResponse.json({ ok: true });
  }
  if (id) {
    const ok = deleteAlert(id);
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ error: "id or ticker required" }, { status: 400 });
}
