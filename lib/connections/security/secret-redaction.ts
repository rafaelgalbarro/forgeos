/** ForgeOS Real Connections — secret redaction (RC5). */

const SENSITIVE_PATTERNS = [
  /ghp_[a-zA-Z0-9]{20,}/g,
  /gho_[a-zA-Z0-9]{20,}/g,
  /github_pat_[a-zA-Z0-9_]{20,}/gi,
  /sbp_[a-zA-Z0-9]{20,}/g,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /api[_-]?key[=:]\s*["']?[a-zA-Z0-9._-]+/gi,
  /token[=:]\s*["']?[a-zA-Z0-9._-]+/gi,
  /[a-zA-Z0-9]{32,}/g,
];

export function redactSecrets(input: string): string {
  let result = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

export function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return redactSecrets(obj) as T;
  if (Array.isArray(obj)) return obj.map(redactObject) as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("apikey") ||
        lower.includes("api_key") ||
        lower.includes("authorization")
      ) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactObject(value);
      }
    }
    return out as T;
  }
  return obj;
}
