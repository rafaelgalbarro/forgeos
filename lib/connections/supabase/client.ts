/** ForgeOS Real Connections — Supabase API client (server-side only, RC5). */

import { getCredential } from "../security/credential-store";
import type { SupabaseProject } from "./types";

const SUPABASE_API = "https://api.supabase.com/v1";

async function supabaseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCredential("supabase");
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN not configured");

  const res = await fetch(`${SUPABASE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function validateSupabaseConnection(): Promise<{ projectCount: number }> {
  const projects = await supabaseFetch<SupabaseProject[]>("/projects");
  return { projectCount: projects.length };
}

export async function listSupabaseProjects(): Promise<SupabaseProject[]> {
  return supabaseFetch<SupabaseProject[]>("/projects");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getCredential("supabase"));
}
