import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";

const BLOCKED_PATHS = ["/api/ibkr/orders", "/api/proposals", "/execute"];

function isOrderSubmissionAttempt(request: BrokerEngineRequest): boolean {
  const path = request.path.toLowerCase();
  if (request.method.toUpperCase() !== "POST") return false;
  return BLOCKED_PATHS.some((blockedPath) => path.includes(blockedPath));
}

export function assertShadowEnvironment(flags = process.env): void {
  if (flags.SHADOW_MODE !== "true") {
    throw new Error("SHADOW_MODE must be true.");
  }
  if (flags.LIVE_TRADING_ENABLED !== "false") {
    throw new Error("LIVE_TRADING_ENABLED must be false while SHADOW_MODE=true.");
  }
}

export class ShadowModeBrokerGuard implements BrokerEngine {
  readonly name;

  constructor(private readonly delegate: BrokerEngine, private readonly flags = process.env) {
    this.name = delegate.name;
  }

  async request<T>(request: BrokerEngineRequest): Promise<T> {
    assertShadowEnvironment(this.flags);
    if (isOrderSubmissionAttempt(request)) {
      throw new Error(`Shadow mode blocked broker submission path: ${request.path}`);
    }
    return this.delegate.request<T>(request);
  }
}

export function wrapBrokerEngineWithShadowGuard(
  brokerEngine: BrokerEngine,
  flags = process.env,
): BrokerEngine {
  return new ShadowModeBrokerGuard(brokerEngine, flags);
}
