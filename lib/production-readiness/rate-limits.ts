/** Program 6500 — Rate limit config */

import { getRateLimitDefault } from "./config";
import type { RateLimitPolicy } from "./types";

export function getRateLimitPolicies(): RateLimitPolicy[] {
  const defaultLimit = getRateLimitDefault();
  return [
    {
      id: "api-global",
      endpoint: "/api/*",
      limit: defaultLimit,
      windowSeconds: 60,
      enabled: true,
    },
    {
      id: "ai-gateway",
      endpoint: "/api/ai/*",
      limit: Math.round(defaultLimit / 2),
      windowSeconds: 60,
      enabled: true,
    },
    {
      id: "auth",
      endpoint: "/api/auth/*",
      limit: 30,
      windowSeconds: 60,
      enabled: true,
    },
  ];
}

export function getRateLimitForEndpoint(path: string): RateLimitPolicy | null {
  const policies = getRateLimitPolicies();
  if (path.startsWith("/api/ai")) return policies.find((p) => p.id === "ai-gateway") ?? null;
  if (path.startsWith("/api/auth")) return policies.find((p) => p.id === "auth") ?? null;
  return policies.find((p) => p.id === "api-global") ?? null;
}
