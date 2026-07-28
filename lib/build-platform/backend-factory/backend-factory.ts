import { buildBackendBlueprint } from "./blueprint-builder";
import type { BackendBlueprint, BackendFactoryInput } from "./types";
import {
  validateBackendBlueprint,
  validateBackendFactoryInput,
} from "./validators";

export interface BackendFactory {
  generateBlueprint(input: BackendFactoryInput): BackendBlueprint;
}

class BackendFactoryEngine implements BackendFactory {
  generateBlueprint(input: BackendFactoryInput): BackendBlueprint {
    validateBackendFactoryInput(input);
    const draft = buildBackendBlueprint(input);
    const validation = validateBackendBlueprint(draft);

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

export function createBackendFactory(): BackendFactory {
  return new BackendFactoryEngine();
}
