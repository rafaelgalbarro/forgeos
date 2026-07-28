import { generateApiPlan } from "./api-generator";
import { generateEventPlan } from "./event-generator";
import { generateJobPlan } from "./job-generator";
import { generatePermissionPlan } from "./permission-generator";
import { generateRepositoryPlan } from "./repository-generator";
import { generateSecurityPlan } from "./security-generator";
import { generateServicePlan } from "./service-generator";
import type { BackendBlueprint, BackendFactoryInput } from "./types";
import { generateWorkerPlan } from "./worker-generator";

export function buildBackendBlueprint(
  input: BackendFactoryInput
): Omit<BackendBlueprint, "validation"> {
  const api = generateApiPlan(input);
  const services = generateServicePlan(input);
  const repositories = generateRepositoryPlan(input);
  const events = generateEventPlan(input);
  const workers = generateWorkerPlan(input);
  const security = generateSecurityPlan(input);
  const permissions = generatePermissionPlan(input);
  const jobs = generateJobPlan(input);

  return {
    meta: {
      ventureId: input.context.meta.ventureId,
      ventureName: input.context.meta.ventureName,
      generatedAt: new Date().toISOString(),
      version: "6.4.0",
      status: "draft",
      stackBackend: input.dna.backendFramework,
      stackDatabase: input.dna.database,
      stackAuth: input.dna.authProvider,
    },
    api,
    services,
    repositories,
    events,
    workers,
    security,
    permissions,
    jobs,
  };
}
