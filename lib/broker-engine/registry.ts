import type { BrokerEngine, BrokerEngineName } from "@/src/core/application/ports/broker-engine";
import { createFutureBrokerEngine } from "./future-broker-engine";
import { createIbkrBrokerEngine } from "./ibkr-broker-engine";
import { createPaperBrokerEngine } from "./paper-broker-engine";
import { createReplayBrokerEngine } from "./replay-broker-engine";
import { resolveBrokerEngineFromMode } from "./trading-mode";
import { wrapBrokerEngineWithShadowGuard } from "@/src/core/investment/shadow/guardrails";

export type BrokerEngineFactory = () => BrokerEngine;

const registry = new Map<BrokerEngineName, BrokerEngineFactory>([
  ["ibkr", createIbkrBrokerEngine],
  ["paper", createPaperBrokerEngine],
  ["replay", createReplayBrokerEngine],
  ["future", createFutureBrokerEngine],
]);

export function registerBrokerEngine(name: BrokerEngineName, factory: BrokerEngineFactory): void {
  registry.set(name, factory);
}

export function getConfiguredBrokerEngineName(): BrokerEngineName {
  const value = (process.env.BROKER_ENGINE ?? "paper").toLowerCase();
  if (value === "paper" || value === "replay" || value === "future" || value === "ibkr") return value;
  return "paper";
}

export function createBrokerEngine(name: BrokerEngineName = getConfiguredBrokerEngineName()): BrokerEngine {
  const resolvedName = resolveBrokerEngineFromMode(name);
  const factory = registry.get(resolvedName);
  if (!factory) throw new Error(`Broker engine not registered: ${name}`);
  const engine = factory();
  if (process.env.SHADOW_MODE === "true") {
    return wrapBrokerEngineWithShadowGuard(engine, process.env);
  }
  return engine;
}
