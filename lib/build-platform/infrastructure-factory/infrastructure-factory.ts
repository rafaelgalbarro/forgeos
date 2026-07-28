import { buildInfraBlueprint } from "./blueprint-builder";
import type { InfraBlueprint, InfraFactoryInput } from "./types";
import {
  validateInfraBlueprint,
  validateInfraFactoryInput,
} from "./validators";

export interface InfrastructureFactory {
  generateBlueprint(input: InfraFactoryInput): InfraBlueprint;
}

class InfrastructureFactoryEngine implements InfrastructureFactory {
  generateBlueprint(input: InfraFactoryInput): InfraBlueprint {
    validateInfraFactoryInput(input);
    const draft = buildInfraBlueprint(input);
    const validation = validateInfraBlueprint(draft);

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

export function createInfrastructureFactory(): InfrastructureFactory {
  return new InfrastructureFactoryEngine();
}
