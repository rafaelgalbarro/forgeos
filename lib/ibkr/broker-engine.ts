/**
 * Backward-compatible shim for legacy IBKR-specific imports.
 * New code should import BrokerEngine implementations from "@/lib/broker-engine".
 */
export { IbkrBrokerEngine, createIbkrBrokerEngine } from "@/lib/broker-engine/ibkr-broker-engine";
