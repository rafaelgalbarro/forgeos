/** ForgeOS Worker Runtime — capability catalog (Epic 4.3). */

import type { WorkerCapability } from "./types";

export const CAPABILITY_CATALOG: Record<string, WorkerCapability> = {
  // Executive
  strategic_decisions: { id: "strategic_decisions", label: "Strategic Decisions", description: "CEO-level venture direction" },
  board_coordination: { id: "board_coordination", label: "Board Coordination", description: "Executive board alignment" },
  venture_approval: { id: "venture_approval", label: "Venture Approval", description: "Gate approvals and go/no-go" },
  // Research
  market_research: { id: "market_research", label: "Market Research", description: "Market sizing and trends" },
  competitor_analysis: { id: "competitor_analysis", label: "Competitor Analysis", description: "Competitive landscape mapping" },
  source_validation: { id: "source_validation", label: "Source Validation", description: "Source credibility and triangulation" },
  validation: { id: "validation", label: "Validation", description: "Hypothesis and assumption validation" },
  // Product
  prd_authoring: { id: "prd_authoring", label: "PRD Authoring", description: "Product requirements documents" },
  user_stories: { id: "user_stories", label: "User Stories", description: "User story generation" },
  scope_definition: { id: "scope_definition", label: "Scope Definition", description: "MVP and feature scoping" },
  // UX
  user_flows: { id: "user_flows", label: "User Flows", description: "End-to-end user journey flows" },
  wireframes: { id: "wireframes", label: "Wireframes", description: "Low-fidelity interface wireframes" },
  usability: { id: "usability", label: "Usability", description: "Usability heuristics and review" },
  // Architecture
  system_design: { id: "system_design", label: "System Design", description: "High-level system architecture" },
  api_design: { id: "api_design", label: "API Design", description: "REST/GraphQL API contracts" },
  infrastructure: { id: "infrastructure", label: "Infrastructure", description: "Cloud and infra planning" },
  // CTO
  tech_strategy: { id: "tech_strategy", label: "Tech Strategy", description: "Technology roadmap and stack decisions" },
  code_review: { id: "code_review", label: "Code Review", description: "Engineering quality gates" },
  // Backend
  api_implementation: { id: "api_implementation", label: "API Implementation", description: "Backend API development" },
  services: { id: "services", label: "Services", description: "Microservice and domain services" },
  database_integration: { id: "database_integration", label: "Database Integration", description: "ORM and data layer" },
  // Frontend
  ui_implementation: { id: "ui_implementation", label: "UI Implementation", description: "React/UI component development" },
  responsive_design: { id: "responsive_design", label: "Responsive Design", description: "Mobile and responsive layouts" },
  // Database
  schema_design: { id: "schema_design", label: "Schema Design", description: "Relational/document schema design" },
  migrations: { id: "migrations", label: "Migrations", description: "Database migration scripts" },
  data_modeling: { id: "data_modeling", label: "Data Modeling", description: "Entity relationship modeling" },
  // QA
  testing: { id: "testing", label: "Testing", description: "Unit, integration, and E2E testing" },
  accessibility: { id: "accessibility", label: "Accessibility", description: "WCAG and a11y compliance" },
  performance: { id: "performance", label: "Performance", description: "Load and performance testing" },
  security_review: { id: "security_review", label: "Security Review", description: "Security vulnerability assessment" },
  // Marketing
  messaging: { id: "messaging", label: "Messaging", description: "Brand and product messaging" },
  campaigns: { id: "campaigns", label: "Campaigns", description: "Marketing campaign planning" },
  content: { id: "content", label: "Content", description: "Content strategy and copy" },
  // Growth
  acquisition: { id: "acquisition", label: "Acquisition", description: "User acquisition strategies" },
  retention: { id: "retention", label: "Retention", description: "Retention and engagement loops" },
  experiments: { id: "experiments", label: "Experiments", description: "Growth experiment design" },
  // Finance
  financial_modeling: { id: "financial_modeling", label: "Financial Modeling", description: "Revenue and cost projections" },
  budgeting: { id: "budgeting", label: "Budgeting", description: "Budget planning and tracking" },
  risk_assessment: { id: "risk_assessment", label: "Risk Assessment", description: "Financial and operational risk" },
  // Legal
  compliance: { id: "compliance", label: "Compliance", description: "Regulatory compliance review" },
  contracts: { id: "contracts", label: "Contracts", description: "Contract drafting and review" },
  ip_protection: { id: "ip_protection", label: "IP Protection", description: "Intellectual property guidance" },
  // Operations
  process_design: { id: "process_design", label: "Process Design", description: "Operational workflows" },
  sla_management: { id: "sla_management", label: "SLA Management", description: "Service level agreements" },
  vendor_management: { id: "vendor_management", label: "Vendor Management", description: "Third-party vendor coordination" },
  // Support
  ticket_triage: { id: "ticket_triage", label: "Ticket Triage", description: "Customer support ticket routing" },
  knowledge_base: { id: "knowledge_base", label: "Knowledge Base", description: "Support documentation" },
  customer_success: { id: "customer_success", label: "Customer Success", description: "Onboarding and success plans" },
  // Capital
  fundraising: { id: "fundraising", label: "Fundraising", description: "Investor outreach and pitch prep" },
  investor_relations: { id: "investor_relations", label: "Investor Relations", description: "Investor updates and reporting" },
  valuation: { id: "valuation", label: "Valuation", description: "Company valuation analysis" },
  // Knowledge
  memory_write: { id: "memory_write", label: "Memory Write", description: "Venture and company memory persistence" },
  documentation: { id: "documentation", label: "Documentation", description: "Technical and product documentation" },
  indexing: { id: "indexing", label: "Indexing", description: "Knowledge base indexing and search" },
  // Analytics
  metrics_reporting: { id: "metrics_reporting", label: "Metrics Reporting", description: "KPI dashboards and reports" },
  data_analysis: { id: "data_analysis", label: "Data Analysis", description: "Product and business analytics" },
  funnel_analysis: { id: "funnel_analysis", label: "Funnel Analysis", description: "Conversion funnel analysis" },
  // Build
  build_execution: { id: "build_execution", label: "Build Execution", description: "Code generation and build runs" },
  build_planning: { id: "build_planning", label: "Build Planning", description: "Build plan creation and review" },
  // Deployment
  ci_cd: { id: "ci_cd", label: "CI/CD", description: "Continuous integration and deployment" },
  staging_deploy: { id: "staging_deploy", label: "Staging Deploy", description: "Staging environment deployment" },
  production_deploy: { id: "production_deploy", label: "Production Deploy", description: "Production release deployment" },
  monitoring: { id: "monitoring", label: "Monitoring", description: "Observability and alerting setup" },
};

export function cap(...ids: (keyof typeof CAPABILITY_CATALOG)[]): WorkerCapability[] {
  return ids.map((id) => CAPABILITY_CATALOG[id]);
}
