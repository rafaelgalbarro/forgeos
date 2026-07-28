/** ForgeOS Marketing Skills — provider configurations (RC4.5). */

import type { MarketingProviderConfig } from "./types";

export const MARKETING_PROVIDER_CONFIGS: MarketingProviderConfig[] = [
  {
    domain: "campaigns",
    id: "marketing-campaigns",
    name: "Marketing Campaigns",
    provider: "campaigns",
    capability: "campaign_management",
    actions: [
      { id: "create", name: "Create Campaign", description: "Create a new marketing campaign", riskLevel: "MEDIUM" },
      { id: "launch", name: "Launch Campaign", description: "Launch campaign to channels", riskLevel: "HIGH" },
      { id: "pause", name: "Pause Campaign", description: "Pause active campaign", riskLevel: "LOW" },
      { id: "analyze", name: "Analyze Campaign", description: "Analyze campaign performance", riskLevel: "LOW" },
    ],
    risks: ["external_api", "ad_spend"],
  },
  {
    domain: "seo",
    id: "marketing-seo",
    name: "SEO Tools",
    provider: "seo",
    capability: "seo_analysis",
    actions: [
      { id: "audit", name: "SEO Audit", description: "Run site SEO audit", riskLevel: "LOW" },
      { id: "keywords", name: "Keyword Research", description: "Research target keywords", riskLevel: "LOW" },
      { id: "rankings", name: "Track Rankings", description: "Monitor keyword rankings", riskLevel: "LOW" },
      { id: "optimize", name: "Optimize Page", description: "Apply SEO optimizations", riskLevel: "MEDIUM" },
    ],
    risks: ["external_api"],
  },
  {
    domain: "analytics",
    id: "marketing-analytics",
    name: "Marketing Analytics",
    provider: "analytics",
    capability: "analytics_query",
    actions: [
      { id: "track", name: "Track Event", description: "Track marketing event", riskLevel: "LOW" },
      { id: "report", name: "Generate Report", description: "Generate analytics report", riskLevel: "LOW" },
      { id: "dashboards", name: "Build Dashboard", description: "Create analytics dashboard", riskLevel: "MEDIUM" },
    ],
    risks: ["external_api", "data_access"],
  },
  {
    domain: "ads",
    id: "marketing-ads",
    name: "Ad Platform",
    provider: "ads",
    capability: "ad_campaign",
    actions: [
      { id: "create", name: "Create Ad", description: "Create ad creative and campaign", riskLevel: "HIGH" },
      { id: "bid", name: "Adjust Bid", description: "Modify bid strategy", riskLevel: "HIGH" },
      { id: "budget", name: "Set Budget", description: "Allocate ad budget", riskLevel: "CRITICAL" },
      { id: "performance", name: "View Performance", description: "Review ad performance metrics", riskLevel: "LOW" },
    ],
    risks: ["external_api", "ad_spend", "financial"],
    estimatedCostPerCall: 0.05,
  },
  {
    domain: "social",
    id: "marketing-social",
    name: "Social Media",
    provider: "social",
    capability: "social_posting",
    actions: [
      { id: "post", name: "Post Content", description: "Publish social post", riskLevel: "MEDIUM" },
      { id: "schedule", name: "Schedule Post", description: "Schedule future post", riskLevel: "LOW" },
      { id: "engage", name: "Engage Audience", description: "Reply and engage with audience", riskLevel: "MEDIUM" },
      { id: "monitor", name: "Monitor Mentions", description: "Monitor brand mentions", riskLevel: "LOW" },
    ],
    risks: ["external_api", "brand_reputation"],
  },
  {
    domain: "content",
    id: "marketing-content",
    name: "Content Marketing",
    provider: "content",
    capability: "content_management",
    actions: [
      { id: "create", name: "Create Content", description: "Create marketing content", riskLevel: "LOW" },
      { id: "publish", name: "Publish Content", description: "Publish content to channels", riskLevel: "MEDIUM" },
      { id: "calendar", name: "Content Calendar", description: "Manage content calendar", riskLevel: "LOW" },
      { id: "assets", name: "Manage Assets", description: "Manage content assets", riskLevel: "LOW" },
    ],
    risks: ["external_api", "brand_reputation"],
  },
  {
    domain: "email",
    id: "marketing-email",
    name: "Email Marketing",
    provider: "email",
    capability: "email_campaign",
    actions: [
      { id: "newsletter", name: "Send Newsletter", description: "Send newsletter to subscribers", riskLevel: "HIGH" },
      { id: "sequence", name: "Email Sequence", description: "Trigger email sequence", riskLevel: "HIGH" },
      { id: "ab_test", name: "A/B Test", description: "Run email A/B test", riskLevel: "MEDIUM" },
      { id: "send", name: "Send Email", description: "Send transactional/marketing email", riskLevel: "HIGH" },
    ],
    risks: ["external_api", "spam_compliance", "financial"],
  },
  {
    domain: "automation",
    id: "marketing-automation",
    name: "Marketing Automation",
    provider: "automation",
    capability: "workflow_automation",
    actions: [
      { id: "workflow", name: "Create Workflow", description: "Create automation workflow", riskLevel: "MEDIUM" },
      { id: "trigger", name: "Set Trigger", description: "Configure workflow trigger", riskLevel: "MEDIUM" },
      { id: "journey", name: "Customer Journey", description: "Design customer journey", riskLevel: "MEDIUM" },
      { id: "activate", name: "Activate Automation", description: "Activate automation workflow", riskLevel: "HIGH" },
    ],
    risks: ["external_api", "automation_scope"],
  },
];

export function getMarketingProviderConfig(domain: MarketingProviderConfig["domain"]): MarketingProviderConfig {
  const config = MARKETING_PROVIDER_CONFIGS.find((c) => c.domain === domain);
  if (!config) throw new Error(`Marketing provider config not found: ${domain}`);
  return config;
}
