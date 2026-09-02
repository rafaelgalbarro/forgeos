"use client";

/**
 * IBKR dashboard entry — reuses terminal composition.
 * Connection logic lives in use-broker-terminal-data (same /api/broker proxies).
 * ANALYSIS_ONLY · no order creation from this surface.
 */
export { BrokerTerminal as IbkrDashboard } from "./terminal";
