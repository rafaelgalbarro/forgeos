import { buildDatabaseBlueprint } from "./blueprint-builder";
import type { DatabaseBlueprint, DatabaseFactoryInput } from "./types";
import {
  validateDatabaseBlueprint,
  validateDatabaseFactoryInput,
} from "./validators";

export interface DatabaseFactory {
  generateBlueprint(input: DatabaseFactoryInput): DatabaseBlueprint;
}

class DatabaseFactoryEngine implements DatabaseFactory {
  generateBlueprint(input: DatabaseFactoryInput): DatabaseBlueprint {
    validateDatabaseFactoryInput(input);
    const draft = buildDatabaseBlueprint(input);
    const validation = validateDatabaseBlueprint(draft);

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

export function createDatabaseFactory(): DatabaseFactory {
  return new DatabaseFactoryEngine();
}
