import type { DeploymentChecklistItem, ReleaseArtifacts } from "./types";

export function buildDeploymentChecklist(
  artifacts: ReleaseArtifacts,
): DeploymentChecklistItem[] {
  const items: DeploymentChecklistItem[] = [
    {
      id: "preflight-context",
      category: "preflight",
      label: "Build Context and DNA reviewed",
      completed: false,
      owner: "Tech Lead",
    },
    {
      id: "preflight-gates",
      category: "preflight",
      label: "All quality gates passed or waived",
      completed: false,
      owner: "Release Manager",
    },
    {
      id: "preflight-approvals",
      category: "preflight",
      label: "Approval workflow completed",
      completed: false,
      owner: "Product Owner",
    },
    {
      id: "deploy-frontend",
      category: "deploy",
      label: "Frontend blueprint artifacts staged",
      completed: Boolean(artifacts.frontendBlueprint?.validation.valid),
      owner: "Frontend Lead",
    },
    {
      id: "deploy-backend",
      category: "deploy",
      label: "Backend API blueprint validated",
      completed: Boolean(artifacts.backendBlueprint?.validation.valid),
      owner: "Backend Lead",
    },
    {
      id: "deploy-database",
      category: "deploy",
      label: "Database migrations reviewed",
      completed: Boolean(artifacts.databaseBlueprint?.migrations.length),
      owner: "Database Owner",
    },
    {
      id: "deploy-infra",
      category: "deploy",
      label: "Infrastructure spec aligned with target cloud",
      completed: Boolean(artifacts.infrastructureSpec?.validation.valid),
      owner: "Platform Engineer",
    },
    {
      id: "post-qa",
      category: "post-deploy",
      label: "QA smoke suite executed",
      completed: false,
      owner: "QA Lead",
    },
    {
      id: "post-monitor",
      category: "post-deploy",
      label: "Health checks and observability confirmed",
      completed: false,
      owner: "SRE",
    },
    {
      id: "rollback-plan",
      category: "rollback",
      label: "Rollback plan acknowledged by on-call",
      completed: false,
      owner: "Release Manager",
    },
  ];

  return items;
}
