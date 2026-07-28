/** ForgeOS Skills Framework — Skill Registry (RC4 + RC4.2). */

import { BUSINESS_SKILL_REGISTRY } from "./business/registry";
import { MARKETING_SKILL_REGISTRY } from "./marketing/registry";
import { ANALYTICS_SKILL_REGISTRY } from "./analytics/registry";
import { PRODUCTIVITY_SKILL_DEFINITIONS } from "./productivity/registry";
import { DEVELOPER_SKILL_REGISTRY } from "./developer/registry";
import { CLOUD_SKILL_REGISTRY } from "./cloud/registry";
import type { SkillCategory, SkillDefinition } from "./types";
import { getAISkillRegistry } from "./ai/registry";

const UNAVAILABLE_SKILL: SkillDefinition = {
  id: "UNAVAILABLE_SKILL",
  name: "Unavailable Skill",
  category: "ai",
  version: "0.0.0",
  provider: "UNKNOWN_PROVIDER",
  requiredCredentials: [],
  estimatedCostPerCall: 0,
  estimatedLatencyMs: 0,
  permissions: [],
  risks: [],
  capability: "disabled",
  status: "disabled",
  health: "unavailable",
};

function skill(
  id: string,
  name: string,
  category: SkillCategory,
  provider: string,
  capability: string,
  creds: string[] = [],
  risks: string[] = ["external_api"]
): SkillDefinition {
  return {
    id,
    name,
    category,
    version: "1.0.0",
    provider,
    requiredCredentials: creds,
    estimatedCostPerCall: category === "ai" ? 0.02 : 0.001,
    estimatedLatencyMs: category === "ai" ? 2000 : 400,
    permissions: [`${id}:execute`],
    risks,
    capability,
    status: "active",
    health: "healthy",
  };
}

let cachedSkillRegistry: SkillDefinition[] | null = null;

function buildSkillRegistry(): SkillDefinition[] {
  const LEGACY_SKILL_REGISTRY: SkillDefinition[] = [
  // Communication
  skill("email", "Email", "communication", "smtp", "send_email", ["SMTP_HOST"]),
  skill("calendar", "Calendar", "communication", "google", "schedule_event", ["GOOGLE_CALENDAR_TOKEN"]),
  skill("slack", "Slack", "communication", "slack", "post_message", ["SLACK_BOT_TOKEN"]),
  skill("discord", "Discord", "communication", "discord", "post_message", ["DISCORD_BOT_TOKEN"]),
  skill("teams", "Microsoft Teams", "communication", "microsoft", "post_message", ["TEAMS_WEBHOOK"]),
  // CRM
  skill("hubspot", "HubSpot", "crm", "hubspot", "crm_sync", ["HUBSPOT_API_KEY"]),
  skill("salesforce", "Salesforce", "crm", "salesforce", "crm_sync", ["SALESFORCE_TOKEN"]),
  skill("pipedrive", "Pipedrive", "crm", "pipedrive", "crm_sync", ["PIPEDRIVE_API_KEY"]),
  // Documents
  skill("google-docs", "Google Docs", "documents", "google", "edit_document", ["GOOGLE_DOCS_TOKEN"]),
  skill("notion", "Notion", "documents", "notion", "edit_page", ["NOTION_API_KEY"]),
  skill("confluence", "Confluence", "documents", "atlassian", "edit_page", ["CONFLUENCE_TOKEN"]),
  skill("google-drive", "Google Drive", "documents", "google", "file_ops", ["GOOGLE_DRIVE_TOKEN"]),
  // Development
  skill("github", "GitHub", "development", "github", "repository_ops", ["GITHUB_TOKEN"]),
  skill("gitlab", "GitLab", "development", "gitlab", "repository_ops", ["GITLAB_TOKEN"]),
  skill("bitbucket", "Bitbucket", "development", "bitbucket", "repository_ops", ["BITBUCKET_TOKEN"]),
  skill("vscode", "VS Code", "development", "microsoft", "ide_integration"),
  skill("cursor", "Cursor", "development", "cursor", "ide_integration"),
  // CI/CD
  skill("docker", "Docker", "cicd", "docker", "container_ops", ["DOCKER_TOKEN"]),
  skill("vercel", "Vercel", "cicd", "vercel", "deploy", ["VERCEL_TOKEN"]),
  skill("netlify", "Netlify", "cicd", "netlify", "deploy", ["NETLIFY_TOKEN"]),
  skill("railway", "Railway", "cicd", "railway", "deploy", ["RAILWAY_TOKEN"]),
  skill("cloudflare", "Cloudflare", "cicd", "cloudflare", "cdn_deploy", ["CLOUDFLARE_TOKEN"]),
  // Cloud
  skill("aws", "AWS", "cloud", "amazon", "cloud_ops", ["AWS_ACCESS_KEY_ID"], ["cloud_cost", "infra_change"]),
  skill("azure", "Azure", "cloud", "microsoft", "cloud_ops", ["AZURE_SUBSCRIPTION_KEY"], ["cloud_cost"]),
  skill("gcp", "GCP", "cloud", "google", "cloud_ops", ["GCP_SERVICE_ACCOUNT"], ["cloud_cost"]),
  // Database
  skill("supabase", "Supabase", "database", "supabase", "database_ops", ["SUPABASE_KEY"]),
  skill("firebase", "Firebase", "database", "google", "database_ops", ["FIREBASE_KEY"]),
  // Payments
  skill("stripe", "Stripe", "payments", "stripe", "payment_ops", ["STRIPE_SECRET_KEY"], ["financial"]),
  // Analytics
  skill("ga4", "Google Analytics 4", "analytics", "google", "analytics_query", ["GA4_PROPERTY_ID"]),
  skill("posthog", "PostHog", "analytics", "posthog", "analytics_query", ["POSTHOG_API_KEY"]),
  skill("mixpanel", "Mixpanel", "analytics", "mixpanel", "analytics_query", ["MIXPANEL_TOKEN"]),
  skill("amplitude", "Amplitude", "analytics", "amplitude", "analytics_query", ["AMPLITUDE_API_KEY"]),
  // Marketing
  skill("meta-ads", "Meta Ads", "marketing", "meta", "ad_campaign", ["META_ADS_TOKEN"]),
  skill("linkedin-ads", "LinkedIn Ads", "marketing", "linkedin", "ad_campaign", ["LINKEDIN_ADS_TOKEN"]),
  skill("google-ads", "Google Ads", "marketing", "google", "ad_campaign", ["GOOGLE_ADS_TOKEN"]),
  skill("tiktok-ads", "TikTok Ads", "marketing", "tiktok", "ad_campaign", ["TIKTOK_ADS_TOKEN"]),
  skill("x-ads", "X Ads", "marketing", "x", "ad_campaign", ["X_ADS_TOKEN"]),
  skill("seo", "SEO Tools", "marketing", "generic", "seo_analysis"),
  // Finance
  skill("quickbooks", "QuickBooks", "finance", "intuit", "accounting", ["QUICKBOOKS_TOKEN"]),
  skill("holded", "Holded", "finance", "holded", "accounting", ["HOLDED_API_KEY"]),
  skill("odoo", "Odoo ERP", "finance", "odoo", "erp_ops", ["ODOO_API_KEY"]),
  // Legal
  skill("docusign", "DocuSign", "legal", "docusign", "sign_document", ["DOCUSIGN_TOKEN"]),
  skill("contracts", "Contracts", "legal", "generic", "contract_review"),
  // Storage
  skill("s3", "Amazon S3", "storage", "amazon", "object_storage", ["AWS_S3_BUCKET"]),
  skill("cloudflare-r2", "Cloudflare R2", "storage", "cloudflare", "object_storage", ["R2_ACCESS_KEY"]),
  skill("dropbox", "Dropbox", "storage", "dropbox", "file_storage", ["DROPBOX_TOKEN"]),
  skill("local-storage", "Local Storage", "storage", "local", "file_storage"),
  // AI (routed via AI Runtime — never direct)
  skill("openai-skill", "OpenAI", "ai", "openai", "ai_completion", ["OPENAI_API_KEY"], ["ai_cost"]),
  skill("claude-skill", "Claude", "ai", "anthropic", "ai_completion", ["ANTHROPIC_API_KEY"], ["ai_cost"]),
  skill("gemini-skill", "Gemini", "ai", "google", "ai_completion", ["GOOGLE_AI_API_KEY"], ["ai_cost"]),
  skill("deepseek-skill", "DeepSeek", "ai", "deepseek", "ai_completion", ["DEEPSEEK_API_KEY"], ["ai_cost"]),
  skill("mistral-skill", "Mistral", "ai", "mistral", "ai_completion", ["MISTRAL_API_KEY"], ["ai_cost"]),
  skill("llama-skill", "Llama", "ai", "meta", "ai_completion", ["GROQ_API_KEY"], ["ai_cost"]),
  skill("openrouter-skill", "OpenRouter", "ai", "openrouter", "ai_completion", ["OPENROUTER_API_KEY"], ["ai_cost"]),
  skill("bedrock-skill", "AWS Bedrock", "ai", "amazon", "ai_completion", ["AWS_BEDROCK_REGION"], ["ai_cost"]),
  skill("vertex-skill", "Vertex AI", "ai", "google", "ai_completion", ["VERTEX_AI_API_KEY"], ["ai_cost"]),
  skill("ollama-skill", "Ollama", "ai", "ollama", "ai_completion", [], ["local_only"]),
  // Business (RC4.4 — sandbox mock providers)
  ...BUSINESS_SKILL_REGISTRY,
  // Marketing (RC4.5 — sandbox mock providers)
  ...MARKETING_SKILL_REGISTRY,
  // Analytics platform (RC4.6 — sandbox mock providers)
  ...ANALYTICS_SKILL_REGISTRY,
  // Productivity (RC4.3 — sandbox mock providers)
  ...PRODUCTIVITY_SKILL_DEFINITIONS,
  // AI Capabilities (RC4.7 — lazy-loaded registry)
  ...getAISkillRegistry(),
  ];

  const RC42_SKILL_IDS = new Set([
    ...DEVELOPER_SKILL_REGISTRY.map((s) => s.id),
    ...CLOUD_SKILL_REGISTRY.map((s) => s.id),
  ]);

  return [
    ...LEGACY_SKILL_REGISTRY.filter((s) => !RC42_SKILL_IDS.has(s.id)),
    ...DEVELOPER_SKILL_REGISTRY,
    ...CLOUD_SKILL_REGISTRY,
  ];
}

function ensureSkillRegistry(): SkillDefinition[] {
  if (!cachedSkillRegistry) {
    cachedSkillRegistry = buildSkillRegistry();
  }
  return cachedSkillRegistry;
}

/** RC4.2 developer & cloud provider modules override legacy entries. */
export const SKILL_REGISTRY: SkillDefinition[] = [];

export function getSkillRegistry(): SkillDefinition[] {
  const registry = ensureSkillRegistry();
  if (SKILL_REGISTRY.length === 0) {
    SKILL_REGISTRY.push(...registry);
  }
  return SKILL_REGISTRY;
}

export function getSkillById(id: string): SkillDefinition | undefined {
  if (id === "UNAVAILABLE_SKILL" || id === "DISABLED_CAPABILITY") {
    return UNAVAILABLE_SKILL;
  }
  return getSkillRegistry().find((s) => s.id === id);
}

export function listSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return getSkillRegistry().filter((s) => s.category === category);
}

export function listAllSkills(): SkillDefinition[] {
  return [...getSkillRegistry()];
}

export function getSkillHealthSummary(): { healthy: number; degraded: number; total: number } {
  const registry = getSkillRegistry();
  const total = registry.length;
  const healthy = registry.filter((s) => s.health === "healthy").length;
  return { healthy, degraded: total - healthy, total };
}
