/** ForgeOS AI Orchestration — errors. */

export class OrchestrationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "OrchestrationError";
  }
}

export class ContextBuildError extends OrchestrationError {
  constructor(message: string) {
    super(message, "CONTEXT_BUILD");
    this.name = "ContextBuildError";
  }
}

export class ValidationError extends OrchestrationError {
  constructor(
    message: string,
    public readonly warnings: string[] = []
  ) {
    super(message, "VALIDATION");
    this.name = "ValidationError";
  }
}
