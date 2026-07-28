import { buildQaBlueprint } from "./blueprint-builder";
import type { QaBlueprint, QaFactoryInput } from "./types";
import { validateQaBlueprint, validateQaFactoryInput } from "./validators";

export interface QaFactory {
  generateBlueprint(input: QaFactoryInput): QaBlueprint;
}

class QaFactoryEngine implements QaFactory {
  generateBlueprint(input: QaFactoryInput): QaBlueprint {
    validateQaFactoryInput(input);
    const draft = buildQaBlueprint(input);
    const validation = validateQaBlueprint(draft);

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

export function createQaFactory(): QaFactory {
  return new QaFactoryEngine();
}
