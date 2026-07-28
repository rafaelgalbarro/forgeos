/** ForgeOS Skills Governance — Rate Limiter (RC4.1). */

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_MAX_CALLS = 30;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

function rateLimitKey(skillId: string, ventureId: string): string {
  return `${ventureId}:${skillId}`;
}

export function checkRateLimit(
  skillId: string,
  ventureId: string,
  maxCalls = DEFAULT_MAX_CALLS
): RateLimitResult {
  const key = rateLimitKey(skillId, ventureId);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxCalls - 1 };
  }

  if (entry.count >= maxCalls) {
    return {
      allowed: false,
      remaining: 0,
      reason: `Rate limit exceeded: ${maxCalls} calls per minute for ${skillId}`,
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxCalls - entry.count };
}

export function resetRateLimit(skillId: string, ventureId: string): void {
  rateLimitStore.delete(rateLimitKey(skillId, ventureId));
}
