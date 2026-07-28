/** ForgeOS AI Gateway — error types. */

export class AIGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = "AIGatewayError";
  }
}

export class ProviderNotConfiguredError extends AIGatewayError {
  constructor(provider: string) {
    super(`Provider not configured: ${provider}`, "PROVIDER_NOT_CONFIGURED", provider);
    this.name = "ProviderNotConfiguredError";
  }
}

export class CostGuardError extends AIGatewayError {
  constructor(message: string) {
    super(message, "COST_GUARD");
    this.name = "CostGuardError";
  }
}

export class AllProvidersFailedError extends AIGatewayError {
  constructor(task: string, causes: string[]) {
    super(`All providers failed for task ${task}: ${causes.join("; ")}`, "ALL_PROVIDERS_FAILED");
    this.name = "AllProvidersFailedError";
  }
}
