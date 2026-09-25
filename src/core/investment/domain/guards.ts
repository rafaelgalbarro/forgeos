export type SerializablePrimitive = string | number | boolean | null;
export type SerializableValue =
  | SerializablePrimitive
  | ReadonlyArray<SerializableValue>
  | { readonly [key: string]: SerializableValue };

export function assertNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

export function assertConfidence(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${fieldName} must be between 0 and 1`);
  }
}

export function assertPercent(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }
}

export function assertSerializable(value: unknown, fieldName: string): void {
  const seen = new Set<unknown>();

  const visit = (current: unknown, path: string): void => {
    if (
      current === null ||
      current === undefined ||
      typeof current === "string" ||
      typeof current === "boolean"
    ) {
      return;
    }

    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw new Error(`${fieldName}.${path} must be a finite number`);
      }
      return;
    }

    if (Array.isArray(current)) {
      if (seen.has(current)) {
        throw new Error(`${fieldName}.${path} cannot contain circular references`);
      }
      seen.add(current);
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      seen.delete(current);
      return;
    }

    if (typeof current === "object") {
      if (seen.has(current)) {
        throw new Error(`${fieldName}.${path} cannot contain circular references`);
      }
      seen.add(current);
      for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
        visit(nested, `${path}.${key}`);
      }
      seen.delete(current);
      return;
    }

    throw new Error(`${fieldName}.${path} contains a non-serializable value`);
  };

  visit(value, "$");
}
