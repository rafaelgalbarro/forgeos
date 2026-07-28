/** Persistence adapter contract — all providers implement this interface. */

import type { PersistenceProvider } from "../types";

export interface PersistenceAdapter {
  readonly provider: PersistenceProvider;
  isAvailable(): boolean;
  read<T>(key: string, fallback: T): Promise<T>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}
