const SEED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export function seedMeta(workerIds: string[] = []) {
  return {
    version: "1.0.0",
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    workerIds,
  };
}

export function slugId(domain: string, name: string): string {
  return `${domain}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
