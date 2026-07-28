/** Postgres persistence adapter — stub for future server-side wiring. */

import type { PersistenceAdapter } from "./adapter-types";
import { getLocalAdapter } from "./local-adapter";

/**
 * Postgres adapter stub.
 * Server routes can implement DATABASE_URL-backed storage later.
 * Client-side code uses local adapter as cache until API routes exist.
 */
export class PostgresAdapter implements PersistenceAdapter {
  readonly provider = "postgres" as const;
  private readonly local = getLocalAdapter();

  isAvailable(): boolean {
    return typeof process !== "undefined" && Boolean(process.env.DATABASE_URL);
  }

  async read<T>(key: string, fallback: T): Promise<T> {
    // Future: GET /api/persistence/:key
    return this.local.read(key, fallback);
  }

  async write<T>(key: string, value: T): Promise<void> {
    await this.local.write(key, value);
    // Future: PUT /api/persistence/:key
  }

  async remove(key: string): Promise<void> {
    await this.local.remove(key);
    // Future: DELETE /api/persistence/:key
  }

  async keys(prefix?: string): Promise<string[]> {
    return this.local.keys(prefix);
  }
}

let postgresAdapterInstance: PostgresAdapter | null = null;

export function getPostgresAdapter(): PostgresAdapter {
  if (!postgresAdapterInstance) postgresAdapterInstance = new PostgresAdapter();
  return postgresAdapterInstance;
}
