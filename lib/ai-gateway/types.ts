/** ForgeOS AI Gateway — shared types. */

export type AIProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "groq"
  | "local"
  | "mock";

export type AITask =
  | "research"
  | "product"
  | "ceo"
  | "board"
  | "strategy"
  | "build-plan"
  | "legal"
  | "marketing"
  | "code"
  | "classification"
  | "ceo-brief"
  | "ceo-review"
  | "ceo-priority"
  | "ceo-risk"
  | "board-debate"
  | "board-vote"
  | "board-consensus"
  | "build-architecture"
  | "build-backend"
  | "build-frontend"
  | "build-database"
  | "build-deploy"
  | "build-qa";

export interface AIGatewayContext {
  system?: string;
  metadata?: Record<string, unknown>;
}

export interface AIGatewayRequest {
  task: AITask;
  input: string;
  context?: AIGatewayContext;
  provider?: AIProviderId;
}

export interface AIGatewayResponse {
  output: string;
  provider: AIProviderId;
  model: string;
  fallbackUsed: boolean;
  costEstimate: number;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface CompletionParams {
  system: string;
  user: string;
  model: string;
  temperature: number;
  maxTokens: number;
  requiresJson?: boolean;
}

export interface CompletionResult {
  text: string;
  provider: AIProviderId;
  model: string;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
}

export interface ModelPolicy {
  task: AITask;
  preferredProviders: AIProviderId[];
  fallbackProviders: AIProviderId[];
  temperature: number;
  maxTokens: number;
  expectedFormat: "text" | "json";
  estimatedCostPer1kTokens: number;
  requiresJson: boolean;
  allowsMock: boolean;
}

export interface AIProvider {
  readonly id: AIProviderId;
  isConfigured(): boolean;
  complete(params: CompletionParams): Promise<CompletionResult>;
}
