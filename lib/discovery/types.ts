export type DiscoveryQuestionType = "single_choice" | "multiple_choice" | "free_text";

export type DiscoveryPriority = "high" | "medium" | "low";

export interface DiscoveryQuestion {
  id: string;
  question: string;
  reason: string;
  type: DiscoveryQuestionType;
  options?: string[];
  priority: DiscoveryPriority;
  impacts: string[];
}

export interface IdeaClassification {
  productType: string;
  marketType: string;
  probableCustomer: string;
  probableBusinessModel: string;
  channels: string[];
  confidence: number;
  signals: string[];
}

export interface MissingDecision {
  id: string;
  topic: string;
  description: string;
  severity: DiscoveryPriority;
}

export interface DefinitionRisk {
  id: string;
  title: string;
  description: string;
}

export interface DiscoveryAnswer {
  questionId: string;
  question: string;
  answer: string | string[];
  answerLabel?: string;
  impacts: string[];
  createdAt: string;
}

export type DiscoveryAnswerMap = Record<string, DiscoveryAnswer>;

export interface AnsweredDiscoveryQuestion extends DiscoveryQuestion {
  answer?: DiscoveryAnswer;
}

export interface DiscoveryContext {
  clarifiedDecisions: string[];
  remainingQuestions: string[];
  inferredProductType: string;
  inferredBusinessModel: string;
  targetCustomerHints: string[];
  monetizationHints: string[];
  trustAndSafetyHints: string[];
  platformHints: string[];
  buildConstraints: string[];
  answers: DiscoveryAnswer[];
}

export interface DiscoveryResult {
  ideaText: string;
  classification: IdeaClassification;
  missingDecisions: MissingDecision[];
  ambiguities: string[];
  definitionRisks: DefinitionRisk[];
  questions: DiscoveryQuestion[];
  discoveryScore: number;
  scoreLabel: string;
}

export interface DiscoveryInput {
  ideaText: string;
}
