import type { BuildContext } from "@/lib/build-platform/build-context";
import type { ReleaseArtifacts, ReleaseNotes } from "./types";

export function buildReleaseNotes(
  context: BuildContext,
  artifacts: ReleaseArtifacts,
): ReleaseNotes {
  const ventureName = context.meta.ventureName;
  const frontend = artifacts.frontendBlueprint;
  const backend = artifacts.backendBlueprint;
  const database = artifacts.databaseBlueprint;
  const qa = artifacts.qaPlan;
  const infra = artifacts.infrastructureSpec;

  const changes = [
    frontend
      ? `Frontend: ${frontend.pages.length} pages, ${frontend.routes.length} routes planned.`
      : null,
    backend
      ? `Backend: ${backend.api.endpoints.length} API endpoints across ${backend.services.length} services.`
      : null,
    database
      ? `Database: ${database.entities.length} entities, ${database.migrations.length} migrations.`
      : null,
    qa ? `QA: ${qa.testPlan.suites.length} test suites with CI gates defined.` : null,
    infra
      ? `Infrastructure: ${infra.docker.services.length} container services, ${infra.cicd.jobs.length} CI jobs.`
      : null,
  ].filter(Boolean) as string[];

  const researchData = context.sections.research?.data;
  const risks = [
    ...(researchData &&
    typeof researchData === "object" &&
    "marketRisks" in researchData
      ? ((researchData as { marketRisks?: string[] }).marketRisks ?? [])
      : []),
    "Release package is spec-only — real deploy risks depend on target environment.",
  ].slice(0, 6);

  const knownIssues = [
    ...artifacts.refs
      .filter((ref) => ref.status === "draft")
      .map((ref) => `${ref.label} is in draft status.`),
    ...(frontend?.validation.issues
      .filter((i) => i.severity === "warning")
      .map((i) => `Frontend: ${i.message}`) ?? []),
    ...(backend?.validation.issues
      .filter((i) => i.severity === "warning")
      .map((i) => `Backend: ${i.message}`) ?? []),
  ].slice(0, 8);

  return {
    summary: `Release package for ${ventureName} consolidates factory blueprints into a review-ready bundle. No deploy execution — artifacts and validations only.`,
    changes: changes.length ? changes : ["Initial release package assembly."],
    risks: risks.length ? risks : ["No significant risks identified in spec review."],
    knownIssues: knownIssues.length ? knownIssues : ["No known issues at package generation time."],
    nextSteps: [
      "Review quality gates and resolve blockers.",
      "Complete approval workflow steps.",
      "Execute deployment checklist in target environment.",
      "Monitor post-release metrics per QA plan.",
    ],
  };
}
