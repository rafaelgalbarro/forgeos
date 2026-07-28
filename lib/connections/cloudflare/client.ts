/** ForgeOS Real Connections — Cloudflare API client (server-side only, RC5). */

import { getCredential } from "../security/credential-store";
import type { CloudflareZone } from "./types";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCredential("cloudflare");
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN not configured");

  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json()) as { success: boolean; errors?: { message: string }[]; result: T };
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message ?? `Cloudflare API error ${res.status}`);
  }
  return data.result;
}

export async function validateCloudflareConnection(): Promise<{ zoneCount: number }> {
  const zones = await cfFetch<CloudflareZone[]>("/zones?per_page=1");
  return { zoneCount: zones.length };
}

export async function listCloudflareZones(): Promise<CloudflareZone[]> {
  return cfFetch<CloudflareZone[]>("/zones?per_page=10");
}

export function isCloudflareConfigured(): boolean {
  return Boolean(getCredential("cloudflare"));
}
