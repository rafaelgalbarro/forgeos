/** PROGRAM 5360 — Dangerous pattern scanner. */

export interface DangerousPatternResult {
  passed: boolean;
  findings: { filePath: string; line: number; pattern: string; message: string }[];
}

const DANGEROUS_PATTERNS: { name: string; regex: RegExp; message: string }[] = [
  { name: "rm-rf", regex: /rm\s+-rf\s+\//, message: "Destructive shell command" },
  { name: "eval", regex: /\beval\s*\(/, message: "Dynamic eval()" },
  { name: "child-process-exec", regex: /require\s*\(\s*['"]child_process['"]\s*\)/, message: "child_process import" },
  { name: "forgeos-import", regex: /from\s+['"]@\/lib\/(forgeos|build-platform|creation-output)/, message: "ForgeOS internal import" },
  { name: "git-push-force", regex: /git\s+push\s+.*--force/, message: "Force git push" },
  { name: "drop-database", regex: /DROP\s+DATABASE/i, message: "DROP DATABASE statement" },
  { name: "external-fetch-hardcoded", regex: /fetch\s*\(\s*['"]https?:\/\/(?!localhost|127\.0\.0\.1)/, message: "Hardcoded external fetch" },
];

export function scanDangerousPatterns(
  files: { path: string; content: string }[]
): DangerousPatternResult {
  const findings: DangerousPatternResult["findings"] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, regex, message } of DANGEROUS_PATTERNS) {
        if (regex.test(line)) {
          findings.push({ filePath: file.path, line: i + 1, pattern: name, message });
        }
      }
    }
  }

  return { passed: findings.length === 0, findings };
}
