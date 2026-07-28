/** Base repository implementations shared across domain repos. */

import type { PersistenceAdapter } from "../adapters/adapter-types";

export abstract class ListRepository<T extends { id: string }> {
  constructor(
    protected readonly adapter: PersistenceAdapter,
    protected readonly storageKey: string
  ) {}

  async findAll(): Promise<T[]> {
    return this.adapter.read<T[]>(this.storageKey, []);
  }

  async findById(id: string): Promise<T | null> {
    const all = await this.findAll();
    return all.find((e) => e.id === id) ?? null;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  async save(entity: T): Promise<T> {
    const all = await this.findAll();
    const i = all.findIndex((e) => e.id === entity.id);
    if (i >= 0) all[i] = entity;
    else all.unshift(entity);
    await this.adapter.write(this.storageKey, all);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    const all = await this.findAll();
    const filtered = all.filter((e) => e.id !== id);
    if (filtered.length === all.length) return false;
    await this.adapter.write(this.storageKey, filtered);
    return true;
  }
}

export abstract class MapRepository<T> {
  constructor(
    protected readonly adapter: PersistenceAdapter,
    protected readonly storageKey: string
  ) {}

  protected async readMap(): Promise<Record<string, T>> {
    return this.adapter.read<Record<string, T>>(this.storageKey, {});
  }

  protected async writeMap(map: Record<string, T>): Promise<void> {
    await this.adapter.write(this.storageKey, map);
  }

  async get(key: string): Promise<T | undefined> {
    const map = await this.readMap();
    return map[key];
  }

  async set(key: string, value: T): Promise<T> {
    const map = await this.readMap();
    map[key] = value;
    await this.writeMap(map);
    return value;
  }

  async delete(key: string): Promise<boolean> {
    const map = await this.readMap();
    if (!(key in map)) return false;
    delete map[key];
    await this.writeMap(map);
    return true;
  }

  async getAll(): Promise<T[]> {
    const map = await this.readMap();
    return Object.values(map);
  }

  async keys(): Promise<string[]> {
    const map = await this.readMap();
    return Object.keys(map);
  }
}
