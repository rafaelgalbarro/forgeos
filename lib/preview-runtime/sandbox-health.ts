/** PROGRAM 5370 — Sandbox health checks. */

import type { PreviewHealthCheck } from "./types";
import { buildPreviewUrl, validatePreviewUrl } from "./security/network-policy";

export async function checkPreviewHealth(port: number, path = "/"): Promise<PreviewHealthCheck> {
  const url = buildPreviewUrl(port) + path;
  validatePreviewUrl(url);
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);

    return {
      ok: res.ok || res.status < 500,
      url,
      statusCode: res.status,
      latencyMs: Date.now() - start,
      lastCheckedAt: new Date().toISOString(),
      message: res.ok ? "Preview responding" : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      url,
      latencyMs: Date.now() - start,
      lastCheckedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Health check failed",
    };
  }
}

export async function waitForHealthy(port: number, maxAttempts = 15, intervalMs = 2000): Promise<PreviewHealthCheck> {
  let last: PreviewHealthCheck = { ok: false, lastCheckedAt: new Date().toISOString(), message: "Not checked" };

  for (let i = 0; i < maxAttempts; i++) {
    last = await checkPreviewHealth(port);
    if (last.ok) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return last;
}
