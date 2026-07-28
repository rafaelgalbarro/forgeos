/** ForgeOS Skills Governance — Risk Engine (RC4.1). */

import { ANALYTICS_SKILL_IDS } from "@/lib/skills/analytics/registry";
import { isAICapabilitySkill } from "@/lib/skills/ai/registry";
import { PRODUCTIVITY_SKILL_IDS } from "@/lib/skills/productivity/registry";
import { getSkillById } from "@/lib/skills/registry";
import { assessProviderActionRisk, isRc42ProviderSkill } from "@/lib/skills/provider-router";
import type { ApprovalType, RiskAssessment, RiskLevel, SandboxMode } from "./types";

const ANALYTICS_SKILLS = new Set(ANALYTICS_SKILL_IDS);
const PRODUCTIVITY_SKILLS = PRODUCTIVITY_SKILL_IDS;
const PRODUCTIVITY_SEND_ACTIONS = /send|share|publish|post_message|record/i;
const CRITICAL_SKILLS = new Set([
  "aws",
  "azure",
  "gcp",
  "stripe",
  "s3",
  "business-payments",
  "marketing-ads",
]);
const HIGH_SKILLS = new Set([
  "vercel",
  "netlify",
  "railway",
  "cloudflare",
  "deployment",
  "business-contracts",
  "business-billing",
  "business-accounting",
  "marketing-campaigns",
  "marketing-email",
  "marketing-ads",
  "marketing-automation",
  "meta-ads",
  "google-ads",
  "linkedin-ads",
]);
const MEDIUM_SKILLS = new Set([
  "github",
  "gitlab",
  "bitbucket",
  "docker",
  "docusign",
  "business-crm",
  "business-erp",
  "business-invoices",
  "business-customers",
  "marketing-social",
  "marketing-content",
  "marketing-seo",
]);

const CRITICAL_ACTIONS = /delete|drop|destroy|purge|wipe|production/i;
const HIGH_ACTIONS = /deploy|production|release|publish|provision/i;
const MEDIUM_ACTIONS = /create|write|update|push|merge/i;

function levelToApproval(level: RiskLevel): ApprovalType {
  switch (level) {
    case "CRITICAL":
      return "board";
    case "HIGH":
      return "dual";
    case "MEDIUM":
      return "ceo";
    default:
      return "auto";
  }
}

function levelToSandbox(level: RiskLevel): SandboxMode {
  if (level === "CRITICAL" || level === "HIGH") return "sandbox";
  if (level === "MEDIUM") return "dry_run";
  return "simulation";
}

export function assessSkillRisk(skillId: string, action: string): RiskAssessment {
  const skill = getSkillById(skillId);
  const factors: string[] = [];
  let score = 10;
  let level: RiskLevel = "LOW";

  if (isRc42ProviderSkill(skillId)) {
    level = assessProviderActionRisk(skillId, action) ?? "LOW";
    factors.push(`RC4.2 provider action risk: ${level}`);
    score =
      level === "CRITICAL" ? 95 : level === "HIGH" ? 75 : level === "MEDIUM" ? 45 : 15;
  } else if (ANALYTICS_SKILLS.has(skillId)) {
    factors.push("Analytics platform skill (sandbox mock)");
    score = /distribute|ml_insights|models/i.test(action) ? 50 : 20;
  } else if (PRODUCTIVITY_SKILLS.has(skillId)) {
    factors.push("Productivity skill (sandbox mock only)");
    if (PRODUCTIVITY_SEND_ACTIONS.test(action)) {
      factors.push("Outbound or share action");
      score = 40;
    } else {
      factors.push("Read or low-impact productivity action");
      score = 15;
    }
  } else if (isAICapabilitySkill(skillId)) {
    factors.push("AI capability skill (sandbox — AI Runtime routing)");
    score = /generate|edit|create|synthesize|store/i.test(action) ? 45 : 25;
  } else if (CRITICAL_SKILLS.has(skillId) || CRITICAL_ACTIONS.test(action)) {
    factors.push("Critical infrastructure or destructive action");
    score = 95;
  } else if (HIGH_SKILLS.has(skillId) || HIGH_ACTIONS.test(action)) {
    factors.push("Production deployment or high-impact action");
    score = 75;
  } else if (MEDIUM_SKILLS.has(skillId) || MEDIUM_ACTIONS.test(action)) {
    factors.push("Resource creation or modification");
    score = 45;
  } else {
    factors.push("Read or low-impact operation");
    score = 15;
  }

  if (!isRc42ProviderSkill(skillId)) {
    if (score >= 85) level = "CRITICAL";
    else if (score >= 65) level = "HIGH";
    else if (score >= 35) level = "MEDIUM";
  }

  if (skill?.risks.includes("financial")) {
    factors.push("Financial risk");
    score = Math.min(100, score + 20);
  }
  if (skill?.risks.includes("ad_spend")) {
    factors.push("Ad spend exposure");
    score = Math.min(100, score + 15);
  }
  if (skill?.risks.includes("spam_compliance")) {
    factors.push("Email compliance risk");
    score = Math.min(100, score + 10);
  }
  if (skill?.risks.includes("cloud_cost")) {
    factors.push("Cloud cost exposure");
    score = Math.min(100, score + 15);
  }
  if (skill?.category === "ai") {
    factors.push("AI provider invocation");
    score = Math.min(100, score + 10);
  }
  if (isAICapabilitySkill(skillId)) {
    factors.push("AI capability skill — AI Runtime routing required");
    score = Math.min(100, score + 5);
  }

  if (!isRc42ProviderSkill(skillId)) {
    if (score >= 85) level = "CRITICAL";
    else if (score >= 65) level = "HIGH";
    else if (score >= 35) level = "MEDIUM";
  }

  return {
    level,
    score,
    factors,
    requiresApproval: levelToApproval(level),
    sandboxMode: levelToSandbox(level),
  };
}

export function getRiskMatrix(): { skillId: string; action: string; level: RiskLevel }[] {
  const samples = [
    { skillId: "google-docs", action: "read_document" },
    { skillId: "github", action: "create_repository" },
    { skillId: "vercel", action: "deploy_production" },
    { skillId: "aws", action: "delete_database" },
    { skillId: "email", action: "send_email" },
    { skillId: "productivity-email", action: "send" },
    { skillId: "productivity-calendar", action: "create_event" },
    { skillId: "productivity-messaging", action: "post_message" },
    { skillId: "stripe", action: "charge_customer" },
    { skillId: "business-payments", action: "charge" },
    { skillId: "business-contracts", action: "sign_contract" },
    { skillId: "business-crm", action: "create_lead" },
    { skillId: "marketing-ads", action: "budget" },
    { skillId: "marketing-email", action: "newsletter" },
    { skillId: "marketing-campaigns", action: "launch" },
    { skillId: "analytics-dashboards", action: "create" },
    { skillId: "analytics-predictions", action: "ml_insights" },
    { skillId: "analytics-reports", action: "distribute" },
    { skillId: "ai-reasoning", action: "plan" },
    { skillId: "ai-coding", action: "generate" },
    { skillId: "ai-rag", action: "generate_with_context" },
  ];
  return samples.map((s) => ({
    ...s,
    level: assessSkillRisk(s.skillId, s.action).level,
  }));
}
