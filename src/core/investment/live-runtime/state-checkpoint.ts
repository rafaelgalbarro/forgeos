import type { RuntimeCheckpoint, RuntimeStateStore } from "./types";

export class InMemoryRuntimeStateStore implements RuntimeStateStore {
  private readonly data = new Map<string, RuntimeCheckpoint>();

  async read(key: string): Promise<RuntimeCheckpoint | null> {
    return this.data.get(key) ?? null;
  }

  async write(key: string, checkpoint: RuntimeCheckpoint): Promise<void> {
    this.data.set(key, checkpoint);
  }
}
