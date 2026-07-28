import type {
  InfraBlueprint,
  InfraBlueprintValidation,
  InfraBlueprintValidationIssue,
  InfraFactoryInput,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: InfraBlueprintValidationIssue["severity"] = "warning"
): InfraBlueprintValidationIssue {
  return { code, message, severity };
}

export function validateInfraFactoryInput(input: InfraFactoryInput): void {
  if (!input.context?.meta?.ventureId) {
    throw new Error("InfraFactoryInput.context.meta.ventureId is required");
  }

  if (!input.dna?.deployment) {
    throw new Error("InfraFactoryInput.dna.deployment is required");
  }

  if (!input.registry || !Array.isArray(input.registry.entries)) {
    throw new Error("InfraFactoryInput.registry.entries must be an array");
  }
}

export function validateInfraBlueprint(
  blueprint: Omit<InfraBlueprint, "validation">
): InfraBlueprintValidation {
  const issues: InfraBlueprintValidationIssue[] = [];

  if (blueprint.docker.services.length === 0) {
    issues.push(issue("DOCKER_SERVICES_EMPTY", "Docker spec must include at least one service", "error"));
  }

  if (blueprint.cicd.jobs.length === 0) {
    issues.push(issue("CICD_JOBS_EMPTY", "CI/CD spec must include at least one job", "error"));
  }

  if (!blueprint.vercel.projectName) {
    issues.push(issue("VERCEL_PROJECT_MISSING", "Vercel project name is required", "error"));
  }

  if (blueprint.supabase.tables.length === 0) {
    issues.push(issue("SUPABASE_TABLES_EMPTY", "Supabase spec should define at least one table"));
  }

  if (blueprint.aws.resources.length === 0) {
    issues.push(issue("AWS_RESOURCES_EMPTY", "AWS spec should define at least one resource"));
  }

  if (blueprint.azure.resources.length === 0) {
    issues.push(issue("AZURE_RESOURCES_EMPTY", "Azure spec should define at least one resource"));
  }

  if (blueprint.gcp.resources.length === 0) {
    issues.push(issue("GCP_RESOURCES_EMPTY", "GCP spec should define at least one resource"));
  }

  const hasRealCredentials = [
    blueprint.vercel.envKeys,
    blueprint.supabase.envKeys,
    blueprint.aws.envKeys,
    blueprint.azure.envKeys,
    blueprint.gcp.envKeys,
  ].some((keys) => keys.some((key) => /secret|password|token/i.test(key) && key.includes("=")));

  if (hasRealCredentials) {
    issues.push(issue("CREDENTIALS_DETECTED", "Blueprint must not contain real credential values", "error"));
  }

  return {
    valid: issues.every((current) => current.severity !== "error"),
    issues,
  };
}
