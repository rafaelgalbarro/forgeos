/** User / Founder repository — Program 3000 Sprint 3. */

import { DEFAULT_PREFERENCES, type UserPreferences } from "@/lib/workspace/types";
import type { StoredAuthUser } from "@/lib/workspace/store";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IUserRepository } from "../types";

export class UserRepository implements IUserRepository {
  constructor(private readonly adapter: PersistenceAdapter) {}

  async findAll(): Promise<StoredAuthUser[]> {
    return this.adapter.read<StoredAuthUser[]>(PERSISTENCE_KEYS.users, []);
  }

  async findById(id: string): Promise<StoredAuthUser | null> {
    return (await this.findAll()).find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<StoredAuthUser | null> {
    const normalized = email.toLowerCase();
    return (
      (await this.findAll()).find(
        (u) => u.email.toLowerCase() === normalized
      ) ?? null
    );
  }

  async save(user: StoredAuthUser): Promise<StoredAuthUser> {
    const users = (await this.findAll()).filter(
      (u) => u.id !== user.id && u.email !== user.email
    );
    users.push(user);
    await this.adapter.write(PERSISTENCE_KEYS.users, users);
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const users = await this.findAll();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    await this.adapter.write(PERSISTENCE_KEYS.users, filtered);
    return true;
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const all = await this.adapter.read<Record<string, UserPreferences>>(
      PERSISTENCE_KEYS.preferences,
      {}
    );
    return all[userId] ?? { ...DEFAULT_PREFERENCES };
  }

  async savePreferences(
    userId: string,
    prefs: UserPreferences
  ): Promise<void> {
    const all = await this.adapter.read<Record<string, UserPreferences>>(
      PERSISTENCE_KEYS.preferences,
      {}
    );
    all[userId] = prefs;
    await this.adapter.write(PERSISTENCE_KEYS.preferences, all);
  }
}
