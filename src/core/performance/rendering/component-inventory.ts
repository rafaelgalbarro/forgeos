/**
 * PROGRAM 6100 — Component rendering inventory (SERVER/CLIENT classification).
 */

export interface ComponentInventoryEntry {
  component: string;
  renderMode: "SERVER" | "CLIENT";
  bundleCost: "LOW" | "MEDIUM" | "HIGH";
  dataRequired: string;
  optimization: string;
}

export const COMPONENT_INVENTORY: ComponentInventoryEntry[] = [
  { component: "MissionControlExperience", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "MissionCardProjection[]", optimization: "Server-first shell + streaming sections" },
  { component: "MissionControlV2View", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "GetMissionSummary", optimization: "Light DTO, no full timeline" },
  { component: "MissionPageView", renderMode: "SERVER", bundleCost: "MEDIUM", dataRequired: "GetMissionDetail (section)", optimization: "Section-based lazy load via ?section=" },
  { component: "CompanyCommandCenterView", renderMode: "SERVER", bundleCost: "MEDIUM", dataRequired: "GetCompanyDashboard (sectioned)", optimization: "Per-section Suspense, no full artifact load" },
  { component: "StudioHubView", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "GetProjectSummary", optimization: "Manifest only, no file contents" },
  { component: "CreationOutputStudioClient", renderMode: "CLIENT", bundleCost: "HIGH", dataRequired: "GetOutputDetail on demand", optimization: "Dynamic import, single output at a time" },
  { component: "BuildPipelineDashboard", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "GetBuildStatus (paginated)", optimization: "Paginated list, no full logs" },
  { component: "FirstExperienceHome", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "PortfolioSummaryProjection", optimization: "Card projections only" },
  { component: "MissionControlClient", renderMode: "CLIENT", bundleCost: "MEDIUM", dataRequired: "Event subscriptions", optimization: "Specific events only, no global refetch" },
  { component: "MissionControlNav", renderMode: "CLIENT", bundleCost: "LOW", dataRequired: "Navigation state", optimization: "Static nav, no data fetch" },
  { component: "ProvenanceBadge", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "Provenance enum", optimization: "Inline server component" },
  { component: "PreviewDeploymentHistorySection", renderMode: "SERVER", bundleCost: "LOW", dataRequired: "ReleaseStatusProjection[]", optimization: "Paginated history" },
];
