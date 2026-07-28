/** Default coding standards for generated software (Epic 6.1). */

import type { CodingStandards } from "./types";

export const DEFAULT_CODING_STANDARDS: CodingStandards = {
  codingStyle: "TypeScript strict, functional React, minimal scope diffs",
  namingConvention: "camelCase (vars/functions), PascalCase (components/types), kebab-case (files/routes)",
};
