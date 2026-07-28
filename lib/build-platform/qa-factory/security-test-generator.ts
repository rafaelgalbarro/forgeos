import type { QaFactoryInput, SecurityTestCase, SecurityTestSpec } from "./types";

export function generateSecurityTestPlan(input: QaFactoryInput): SecurityTestSpec {
  const { dna, context } = input;
  const elevated = dna.securityLevel === "elevated";

  const baseCases: SecurityTestCase[] = [
    {
      id: "sec-xss",
      category: "Injection",
      description: "Verify user input is sanitized against XSS in forms and search",
      severity: "critical",
    },
    {
      id: "sec-csrf",
      category: "CSRF",
      description: "State-changing API routes require CSRF protection or SameSite cookies",
      severity: elevated ? "critical" : "high",
    },
    {
      id: "sec-auth",
      category: "Authentication",
      description: "Protected routes redirect unauthenticated users",
      severity: "critical",
    },
    {
      id: "sec-headers",
      category: "Headers",
      description: "Security headers present (CSP, X-Frame-Options, HSTS)",
      severity: "high",
    },
    {
      id: "sec-deps",
      category: "Dependencies",
      description: "No known critical vulnerabilities in npm dependencies",
      severity: "high",
    },
  ];

  if (elevated) {
    baseCases.push({
      id: "sec-data-pii",
      category: "Data Protection",
      description: `PII handling for ${context.meta.ventureName} complies with data minimization`,
      severity: "critical",
    });
  }

  return {
    id: "security-main",
    scanTools: ["npm audit", "OWASP ZAP (baseline)", "eslint-plugin-security"],
    testCases: baseCases,
    complianceChecks: [
      "OWASP Top 10 baseline coverage",
      elevated ? "Auth flows require MFA option" : "Auth flows use secure session handling",
      "Secrets not exposed in client bundles",
      "API rate limiting on public endpoints",
    ],
  };
}
