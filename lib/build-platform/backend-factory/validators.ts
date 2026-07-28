import type {
  BackendBlueprint,
  BackendBlueprintValidation,
  BackendBlueprintValidationIssue,
  BackendFactoryInput,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: BackendBlueprintValidationIssue["severity"] = "warning"
): BackendBlueprintValidationIssue {
  return { code, message, severity };
}

export function validateBackendFactoryInput(input: BackendFactoryInput): void {
  if (!input.context?.meta?.ventureId) {
    throw new Error("BackendFactoryInput.context.meta.ventureId is required");
  }

  if (!input.dna?.backendFramework) {
    throw new Error("BackendFactoryInput.dna.backendFramework is required");
  }

  if (!input.registry || !Array.isArray(input.registry.entries)) {
    throw new Error("BackendFactoryInput.registry.entries must be an array");
  }
}

export function validateBackendBlueprint(
  blueprint: Omit<BackendBlueprint, "validation">
): BackendBlueprintValidation {
  const issues: BackendBlueprintValidationIssue[] = [];

  if (blueprint.api.endpoints.length === 0) {
    issues.push(issue("API_EMPTY", "No API endpoints were generated", "error"));
  }

  if (blueprint.services.length === 0) {
    issues.push(issue("SERVICES_EMPTY", "No service specs were generated", "error"));
  }

  if (blueprint.repositories.length === 0) {
    issues.push(issue("REPOSITORIES_EMPTY", "No repository specs were generated", "error"));
  }

  if (blueprint.events.length === 0) {
    issues.push(issue("EVENTS_EMPTY", "No domain events were generated", "error"));
  }

  if (blueprint.workers.length === 0) {
    issues.push(issue("WORKERS_EMPTY", "No worker specs were generated", "error"));
  }

  if (blueprint.security.rules.length === 0) {
    issues.push(issue("SECURITY_EMPTY", "No security rules were generated", "error"));
  }

  if (blueprint.permissions.length === 0) {
    issues.push(issue("PERMISSIONS_EMPTY", "No permission specs were generated", "error"));
  }

  if (blueprint.jobs.length === 0) {
    issues.push(issue("JOBS_EMPTY", "No background job specs were generated", "error"));
  }

  if (!blueprint.api.endpoints.some((endpoint) => endpoint.path === "/api/health")) {
    issues.push(issue("HEALTH_ENDPOINT_MISSING", "Health endpoint is recommended"));
  }

  if (!blueprint.permissions.some((perm) => perm.role === "admin")) {
    issues.push(issue("ADMIN_ROLE_MISSING", "Admin role permissions are recommended"));
  }

  const orphanServices = blueprint.api.endpoints.filter(
    (endpoint) => !blueprint.services.some((service) => service.id === endpoint.serviceId)
  );
  if (orphanServices.length > 0) {
    issues.push(
      issue(
        "ORPHAN_API_SERVICES",
        `${orphanServices.length} API endpoint(s) reference undefined services`,
        "error"
      )
    );
  }

  return {
    valid: issues.every((current) => current.severity !== "error"),
    issues,
  };
}
