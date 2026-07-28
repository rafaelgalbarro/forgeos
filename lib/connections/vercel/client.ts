/** ForgeOS Real Connections — Vercel API client (server-side only, RC5). */

import { getCredential } from "../security/credential-store";
import type { VercelProject } from "./types";

const VERCEL_API = "https://api.vercel.com";

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCredential("vercel");
  if (!token) throw new Error("VERCEL_TOKEN not configured");

  const res = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function validateVercelConnection(): Promise<{ projectCount: number }> {
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects?limit=1");
  return { projectCount: data.projects?.length ?? 0 };
}

export async function listVercelProjects(): Promise<VercelProject[]> {
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects?limit=10");
  return data.projects ?? [];
}

export function isVercelConfigured(): boolean {
  return Boolean(getCredential("vercel"));
}
