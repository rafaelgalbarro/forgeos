import type { BackendFactoryInput, SecuritySpec } from "./types";

export function generateSecurityPlan(input: BackendFactoryInput): SecuritySpec {
  const contextSecurity = input.context.sections.security?.data;
  const contextRules =
    contextSecurity && typeof contextSecurity === "object" && "requirements" in contextSecurity
      ? (contextSecurity as { requirements?: string[] }).requirements ?? []
      : [];

  const dnaRules = input.dna.securityRules.map((rule, index) => ({
    id: `sec-dna-${index}`,
    rule,
    source: "dna" as const,
    enforcement: inferEnforcement(rule),
  }));

  const contextRuleSpecs = contextRules.map((rule, index) => ({
    id: `sec-ctx-${index}`,
    rule,
    source: "context" as const,
    enforcement: "service" as const,
  }));

  const registryRules = input.registry.entries
    .filter((entry) => entry.category === "generator" && entry.tags.includes("api"))
    .map((entry, index) => ({
      id: `sec-reg-${index}`,
      rule: `Apply validation middleware for ${entry.name}`,
      source: "registry" as const,
      enforcement: "middleware" as const,
    }));

  return {
    id: "security-main",
    oauthRequired: input.dna.oauthRequired,
    encryptDataAtRest: true,
    encryptDataInTransit: true,
    rules: [...dnaRules, ...contextRuleSpecs, ...registryRules],
    middleware: [
      "rate-limit-auth",
      "cors-policy",
      "request-validation",
      "auth-session-guard",
      ...(input.dna.oauthRequired ? ["oauth-token-verify"] : []),
    ],
  };
}

function inferEnforcement(rule: string): "middleware" | "service" | "infrastructure" {
  const lower = rule.toLowerCase();
  if (lower.includes("https") || lower.includes("iam") || lower.includes("encrypt")) {
    return "infrastructure";
  }
  if (lower.includes("rate-limit") || lower.includes("input")) {
    return "middleware";
  }
  return "service";
}
