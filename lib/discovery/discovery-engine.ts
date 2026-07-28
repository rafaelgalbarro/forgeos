import { analyzeDecisions } from "./decision-detector";
import { attachDiscoveryScore } from "./discovery-score";
import { generateDiscoveryQuestions } from "./question-generator";
import type { DiscoveryInput, DiscoveryResult } from "./types";

const MIN_IDEA_LENGTH = 12;

export function runDiscovery(input: DiscoveryInput): DiscoveryResult | null {
  const ideaText = input.ideaText.trim();
  if (ideaText.length < MIN_IDEA_LENGTH) return null;

  const { classification, missingDecisions, ambiguities, definitionRisks } =
    analyzeDecisions(ideaText);

  const questions = generateDiscoveryQuestions(
    ideaText,
    classification,
    missingDecisions,
    definitionRisks
  );

  return attachDiscoveryScore({
    ideaText,
    classification,
    missingDecisions,
    ambiguities,
    definitionRisks,
    questions,
  });
}

/** Top questions for real-time UI (max 5). */
export function previewDiscovery(ideaText: string): DiscoveryResult | null {
  const result = runDiscovery({ ideaText });
  if (!result) return null;

  return {
    ...result,
    questions: result.questions.slice(0, 5),
  };
}
