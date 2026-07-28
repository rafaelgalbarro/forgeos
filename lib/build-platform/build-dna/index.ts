/** Build DNA — public API (Epic 6.1). */

import type { BuildContext } from "@/lib/build-platform/build-context/types";
import { buildDnaFromDefaults } from "./dna-builder";
import type { BuildDna } from "./types";

export function createBuildDnaFromContext(context: BuildContext): BuildDna {
  return buildDnaFromDefaults(context.meta.ventureId, context.meta.ventureName || "Untitled Venture");
}

export type {
  BuildDna,
  BuildDnaBuilderInput,
  BuildDnaMeta,
  BuildDnaOverrides,
  BuildDnaValidationIssue,
  BuildDnaValidationResult,
} from "./types";

export { buildDna, buildDnaFromDefaults } from "./dna-builder";
export { validateBuildDna } from "./dna-validator";
