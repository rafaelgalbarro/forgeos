/** Venture Timeline — event type definitions and mappings (Epic 7.3). */

import type { TimelineCategory, TimelineDepartment } from "./types";

export interface EventTypeDefinition {
  id: string;
  label: string;
  category: TimelineCategory;
  department: TimelineDepartment;
  description: string;
}

export const TIMELINE_DEPARTMENTS: TimelineDepartment[] = [
  "executive",
  "research",
  "product",
  "engineering",
  "build",
  "qa",
  "growth",
  "finance",
  "capital",
  "memory",
];

export const TIMELINE_CATEGORIES: TimelineCategory[] = [
  "CEO Reviews",
  "Board Decisions",
  "Research",
  "Product",
  "Architecture",
  "Build",
  "QA",
  "Deploy",
  "Marketing",
  "Finance",
  "Capital",
  "Memory",
  "Decision Graph",
];

export const DEPARTMENT_LABELS: Record<TimelineDepartment, string> = {
  executive: "Executive",
  research: "Research",
  product: "Product",
  engineering: "Engineering",
  build: "Build",
  qa: "QA",
  growth: "Growth",
  finance: "Finance",
  capital: "Capital",
  memory: "Memory",
};

export const CATEGORY_DEPARTMENT: Record<TimelineCategory, TimelineDepartment> = {
  "CEO Reviews": "executive",
  "Board Decisions": "executive",
  Research: "research",
  Product: "product",
  Architecture: "engineering",
  Build: "build",
  QA: "qa",
  Deploy: "build",
  Marketing: "growth",
  Finance: "finance",
  Capital: "capital",
  Memory: "memory",
  "Decision Graph": "executive",
};

export const EVENT_TYPE_REGISTRY: EventTypeDefinition[] = [
  { id: "venture-created", label: "Venture created", category: "Product", department: "product", description: "Initial venture registration" },
  { id: "intelligence-complete", label: "Intelligence analysis", category: "Research", department: "research", description: "Forge intelligence report completed" },
  { id: "discovery-updated", label: "Discovery session", category: "Product", department: "product", description: "Founder discovery answers recorded" },
  { id: "simulator-run", label: "Venture simulator", category: "Finance", department: "finance", description: "Startup score simulation executed" },
  { id: "research-complete", label: "Market research", category: "Research", department: "research", description: "Research report generated" },
  { id: "prd-generated", label: "PRD generated", category: "Product", department: "product", description: "Product requirements document" },
  { id: "architecture-defined", label: "Architecture defined", category: "Architecture", department: "engineering", description: "Technical architecture documented" },
  { id: "build-started", label: "Build started", category: "Build", department: "build", description: "Construction phase initiated" },
  { id: "package-ready", label: "Startup package ready", category: "Deploy", department: "build", description: "Venture documentation complete" },
  { id: "qa-reviewed", label: "QA review", category: "QA", department: "qa", description: "Quality assurance checkpoint" },
  { id: "landing-defined", label: "Landing page", category: "Marketing", department: "growth", description: "Go-to-market landing defined" },
  { id: "pricing-defined", label: "Pricing model", category: "Finance", department: "finance", description: "Pricing strategy documented" },
  { id: "ceo-review", label: "CEO review", category: "CEO Reviews", department: "executive", description: "Executive CEO task output" },
  { id: "board-decision", label: "Board decision", category: "Board Decisions", department: "executive", description: "Board consensus or vote" },
  { id: "decision-registered", label: "Decision registered", category: "Decision Graph", department: "executive", description: "Intelligence layer decision" },
  { id: "graph-node", label: "Executive graph node", category: "Decision Graph", department: "executive", description: "AI orchestration decision graph" },
  { id: "memory-sync", label: "Memory sync", category: "Memory", department: "memory", description: "Venture memory synchronized" },
  { id: "ai-execution", label: "AI orchestration", category: "Build", department: "build", description: "AI task execution recorded" },
  { id: "capital-milestone", label: "Capital milestone", category: "Capital", department: "capital", description: "Fundraising or investment readiness" },
];

export function getEventType(id: string): EventTypeDefinition | undefined {
  return EVENT_TYPE_REGISTRY.find((e) => e.id === id);
}

export function categoryColor(category: TimelineCategory): string {
  const map: Partial<Record<TimelineCategory, string>> = {
    "CEO Reviews": "var(--fhis-color-accent)",
    "Board Decisions": "var(--fhis-color-blue)",
    Research: "var(--fhis-color-blue)",
    Product: "var(--fhis-color-green)",
    Architecture: "var(--fhis-color-amber)",
    Build: "var(--fhis-color-accent)",
    QA: "var(--fhis-color-amber)",
    Deploy: "var(--fhis-color-green)",
    Marketing: "var(--fhis-color-blue)",
    Finance: "var(--fhis-color-amber)",
    Capital: "var(--fhis-color-accent)",
    Memory: "var(--fhis-color-text-muted)",
    "Decision Graph": "var(--fhis-color-blue)",
  };
  return map[category] ?? "var(--fhis-color-accent)";
}
