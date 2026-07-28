/** PROGRAM 5360 — Secret scanner (blocks real secrets in generated code). */

export interface SecretScanResult {
  passed: boolean;
  findings: { filePath: string; line: number; pattern: string; snippet: string }[];
}

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "aws-access-key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "github-token", regex: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: "openai-key", regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "stripe-live", regex: /sk_live_[a-zA-Z0-9]{20,}/ },
  { name: "private-key", regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "supabase-service-real", regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { name: "password-assignment", regex: /password\s*=\s*['"][^'"]{8,}['"]/i },
  { name: "connection-string-prod", regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@(?!localhost|127\.0\.0\.1)/i },
];

const ALLOWED_PLACEHOLDERS = [
  "your-anon-key",
  "your-service-role-key",
  "change-me",
  "your-project",
  "example",
  "placeholder",
  "localhost",
];

function isAllowedPlaceholder(snippet: string): boolean {
  const lower = snippet.toLowerCase();
  return ALLOWED_PLACEHOLDERS.some((p) => lower.includes(p));
}

export function scanForSecrets(
  files: { path: string; content: string }[]
): SecretScanResult {
  const findings: SecretScanResult["findings"] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, regex } of SECRET_PATTERNS) {
        if (regex.test(line) && !isAllowedPlaceholder(line)) {
          findings.push({
            filePath: file.path,
            line: i + 1,
            pattern: name,
            snippet: line.trim().slice(0, 80),
          });
        }
      }
    }
  }

  return { passed: findings.length === 0, findings };
}
