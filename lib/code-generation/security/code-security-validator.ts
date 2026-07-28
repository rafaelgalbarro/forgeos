/** PROGRAM 5360 — Combined code security validator. */

import type { CodeFile, CodeWarning } from "../types";
import { scanForSecrets } from "./secret-scanner";
import { scanDangerousPatterns } from "./dangerous-pattern-scanner";

export interface CodeSecurityResult {
  passed: boolean;
  warnings: CodeWarning[];
}

export function validateCodeSecurity(files: CodeFile[]): CodeSecurityResult {
  const warnings: CodeWarning[] = [];
  const scanFiles = files.map((f) => ({ path: f.path, content: f.content }));

  const secrets = scanForSecrets(scanFiles);
  if (!secrets.passed) {
    for (const f of secrets.findings) {
      warnings.push({
        id: `sec-secret-${f.filePath}-${f.line}`,
        severity: "error",
        message: `Secret pattern detected (${f.pattern}): ${f.snippet}`,
        filePath: f.filePath,
        code: "SECRET_DETECTED",
      });
    }
  }

  const dangerous = scanDangerousPatterns(scanFiles);
  if (!dangerous.passed) {
    for (const f of dangerous.findings) {
      warnings.push({
        id: `sec-danger-${f.filePath}-${f.line}`,
        severity: "error",
        message: `${f.message} at line ${f.line}`,
        filePath: f.filePath,
        code: "DANGEROUS_PATTERN",
      });
    }
  }

  const errorCount = warnings.filter((w) => w.severity === "error").length;
  return { passed: errorCount === 0, warnings };
}
