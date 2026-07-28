import type { ReleaseArtifacts, RollbackPlan, RollbackRiskLevel } from "./types";

function resolveRiskLevel(artifacts: ReleaseArtifacts): RollbackRiskLevel {
  const hasDb = Boolean(artifacts.databaseBlueprint?.migrations.length);
  const hasInfra = Boolean(artifacts.infrastructureSpec);
  const hasWorkers = Boolean(artifacts.backendBlueprint?.workers.length);

  if (hasDb && hasInfra && hasWorkers) return "high";
  if (hasDb || hasInfra) return "medium";
  return "low";
}

export function buildRollbackPlan(
  ventureName: string,
  artifacts: ReleaseArtifacts,
): RollbackPlan {
  const riskLevel = resolveRiskLevel(artifacts);
  const affectedSystems = [
    "frontend",
    artifacts.backendBlueprint ? "backend-api" : null,
    artifacts.databaseBlueprint ? "database" : null,
    artifacts.infrastructureSpec ? "infrastructure" : null,
  ].filter(Boolean) as string[];

  return {
    strategy: "Blue-green rollback with artifact version pin and database migration reversal plan.",
    affectedSystems,
    backups: [
      "Database snapshot before migration (spec placeholder)",
      "Previous container image tag pinned in registry",
      "Infrastructure state export (Terraform/Pulumi spec reference)",
      "QA regression baseline for smoke verification",
    ],
    steps: [
      {
        order: 1,
        action: "Halt release pipeline and mark deployment as rolled back.",
        owner: "Release Manager",
        estimatedMinutes: 5,
      },
      {
        order: 2,
        action: `Restore previous frontend/backend artifacts for ${ventureName}.`,
        owner: "Platform Engineer",
        estimatedMinutes: 15,
      },
      {
        order: 3,
        action: "Apply down-migration scripts if database schema changed.",
        owner: "Database Owner",
        estimatedMinutes: 20,
      },
      {
        order: 4,
        action: "Revert infrastructure spec to last known good revision.",
        owner: "Infrastructure Owner",
        estimatedMinutes: 25,
      },
      {
        order: 5,
        action: "Run QA smoke suite and confirm service health.",
        owner: "QA Lead",
        estimatedMinutes: 15,
      },
    ],
    riskLevel,
    owner: "Release Manager",
  };
}
