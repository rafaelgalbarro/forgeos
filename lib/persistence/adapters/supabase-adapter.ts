/** Supabase persistence adapter — REST-based stub ready for production wiring. */

import { getSupabaseConfig } from "../config";
import type { PersistenceAdapter } from "./adapter-types";
import { getLocalAdapter } from "./local-adapter";

/**
 * Supabase REST adapter.
 * Uses PostgREST when configured; falls back to local adapter for reads/writes
 * until a `forgeos_entities` table is provisioned.
 *
 * Optional: install @supabase/supabase-js for full client support.
 */
export class SupabaseAdapter implements PersistenceAdapter {
  readonly provider = "supabase" as const;
  private readonly local = getLocalAdapter();
  private readonly config = getSupabaseConfig();

  isAvailable(): boolean {
    return Boolean(this.config);
  }

  private tableUrl(): string | null {
    if (!this.config) return null;
    return `${this.config.url.replace(/\/$/, "")}/rest/v1/forgeos_entities`;
  }

  private headers(): Record<string, string> | null {
    if (!this.config) return null;
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    };
  }

  async read<T>(key: string, fallback: T): Promise<T> {
    const url = this.tableUrl();
    const headers = this.headers();
    if (!url || !headers) return this.local.read(key, fallback);

    try {
      const res = await fetch(
        `${url}?storage_key=eq.${encodeURIComponent(key)}&select=payload`,
        { headers }
      );
      if (!res.ok) return this.local.read(key, fallback);
      const rows = (await res.json()) as { payload: T }[];
      if (!rows.length) return this.local.read(key, fallback);
      return rows[0].payload;
    } catch {
      return this.local.read(key, fallback);
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    await this.local.write(key, value);

    const url = this.tableUrl();
    const headers = this.headers();
    if (!url || !headers) return;

    try {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          storage_key: key,
          payload: value,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch {
      // Local write succeeded; remote sync deferred to sync-layer
    }
  }

  async remove(key: string): Promise<void> {
    await this.local.remove(key);
    const url = this.tableUrl();
    const headers = this.headers();
    if (!url || !headers) return;

    try {
      await fetch(`${url}?storage_key=eq.${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers,
      });
    } catch {
      // noop
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    return this.local.keys(prefix);
  }
}

let supabaseAdapterInstance: SupabaseAdapter | null = null;

export function getSupabaseAdapter(): SupabaseAdapter {
  if (!supabaseAdapterInstance) supabaseAdapterInstance = new SupabaseAdapter();
  return supabaseAdapterInstance;
}
