import { NextRequest, NextResponse } from "next/server";
import { assertPublicApiKey } from "@/lib/integrations/public-api-auth";
import { readSafetyFlags } from "@/src/core/investment/autonomous-live/mode";
import { getTradingMode } from "@/lib/broker-engine/trading-mode";
import { isWebhookExportConfigured } from "@/lib/integrations/webhook-export";
import { parseConfiguredAccountIds } from "@/lib/integrations/multi-account";
import { getRecentInvestmentEvents } from "@/lib/notifications/investment-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/public/v1/status
 * Requires FORGEOS_PUBLIC_API_KEY. ANALYSIS_ONLY summary for external tools.
 */
export async function GET(req: NextRequest) {
  const denied = assertPublicApiKey(req);
  if (denied) return denied;

  const flags = readSafetyFlags();
  const recent = getRecentInvestmentEvents(5);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    tradingMode: getTradingMode(),
    safety: {
      tradingMode: flags.tradingMode,
      liveTradingEnabled: flags.liveTradingEnabled,
      ibkrReadOnly: flags.ibkrReadOnly,
      lockState: flags.lockState,
    },
    integrations: {
      webhookExportConfigured: isWebhookExportConfigured(),
      tradingViewWebhookConfigured: Boolean(process.env.TRADINGVIEW_WEBHOOK_SECRET?.trim()),
      configuredIbkrAccounts: parseConfiguredAccountIds().length,
    },
    recentEvents: recent.map((e) => ({ type: e.type, at: e.at })),
    note: "Public status summary — safe for external dashboards; no order capability",
  });
}
