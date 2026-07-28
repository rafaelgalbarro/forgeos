/**
 * Opaque metadata bag — PROGRAM 6010
 * Keys are stringly; values are JSON-serializable primitives only.
 */

export type MetadataValue = string | number | boolean | null;
export type Metadata = Readonly<Record<string, MetadataValue>>;

export function Metadata(input: Record<string, MetadataValue> = {}): Metadata {
  return Object.freeze({ ...input });
}

export function mergeMetadata(base: Metadata, patch: Record<string, MetadataValue>): Metadata {
  return Object.freeze({ ...base, ...patch });
}
