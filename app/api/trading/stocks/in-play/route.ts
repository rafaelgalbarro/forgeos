import { NextRequest, NextResponse } from "next/server";
import { loadStocksInPlayList } from "@/lib/trading/stocks-in-play/store";
import { runStocksInPlayScanner } from "@/lib/trading/stocks-in-play/scanner";
import { runStocksInPlayBacktest } from "@/lib/trading/stocks-in-play/backtest-runner";
import { getStocksInPlayMode } from "@/lib/trading/stocks-in-play/config";
import { stocksInPlayLiveGate } from "@/lib/trading/stocks-in-play/live-gate";
import { loadStocksRunnersList } from "@/lib/trading/stocks-in-play/runners/store";
import { getStocksRunnersMode } from "@/lib/trading/stocks-in-play/runners/config";
import { sendRunnersWeeklyTelegramReport } from "@/lib/trading/stocks-in-play/runners/telegram";

function authorize(req: NextRequest): boolean {
  const key = process.env.IBKR_INTERNAL_API_KEY?.trim();
  if (!key) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-internal-api-key") === key;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: getStocksInPlayMode(),
    runnersMode: getStocksRunnersMode(),
    liveGate: stocksInPlayLiveGate(),
    list: loadStocksInPlayList(),
    runners: loadStocksRunnersList(),
  });
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    backtest?: boolean;
    backtestDays?: number;
    notifyTelegram?: boolean;
    weeklyRunners?: boolean;
  };
  if (body.weeklyRunners) {
    await sendRunnersWeeklyTelegramReport();
    return NextResponse.json({ ok: true, weeklyRunners: true });
  }
  if (body.backtest) {
    const report = await runStocksInPlayBacktest({ days: body.backtestDays });
    return NextResponse.json({ ok: true, backtest: report });
  }
  const list = await runStocksInPlayScanner({ notifyTelegram: body.notifyTelegram !== false });
  return NextResponse.json({
    ok: true,
    at: list.generatedAt,
    count: list.symbols.length,
    symbols: list.symbols.map((s) => ({ symbol: s.symbol, reason: s.reason })),
  });
}
