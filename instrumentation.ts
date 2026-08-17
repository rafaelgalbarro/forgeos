export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPositionMonitor } = await import("@/src/core/trading/position-monitor");
    const { startTelegramPolling } = await import("@/lib/notifications/telegram-poll");
    const { startWebhookExportListener } = await import("@/lib/integrations/webhook-export");
    const { startApprovalExpiryMonitor } = await import("@/lib/investment/order-approval-service");
    startPositionMonitor();
    startTelegramPolling();
    startApprovalExpiryMonitor();
    startWebhookExportListener();
  }
}
