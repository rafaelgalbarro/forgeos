import { buildFrontendBlueprint } from "./blueprint-builder";
import type { FrontendBlueprint, FrontendFactoryInput } from "./types";
import {
  validateFrontendBlueprint,
  validateFrontendFactoryInput,
} from "./validators";

export interface FrontendFactory {
  generateBlueprint(input: FrontendFactoryInput): FrontendBlueprint;
}

class FrontendFactoryEngine implements FrontendFactory {
  generateBlueprint(input: FrontendFactoryInput): FrontendBlueprint {
    validateFrontendFactoryInput(input);
    const draft = buildFrontendBlueprint(input);
    const validation = validateFrontendBlueprint(draft);

    return {
      ...draft,
      validation,
      meta: {
        ...draft.meta,
        status: validation.valid ? "ready" : "draft",
      },
    };
  }
}

export function createFrontendFactory(): FrontendFactory {
  return new FrontendFactoryEngine();
}
