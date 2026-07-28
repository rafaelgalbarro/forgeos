import type { BuildContext } from "@/lib/build-platform/build-context/types";

export type BackendPlanStatus = "draft" | "ready";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthLevel = "public" | "authenticated" | "admin";

export interface BackendFactoryInput {
  context: BuildContext;
  dna: BackendBuildDna;
  registry: BackendBuildRegistry;
}

export interface BackendBlueprintMeta {
  ventureId: string;
  ventureName: string;
  generatedAt: string;
  version: string;
  status: BackendPlanStatus;
  stackBackend: string;
  stackDatabase: string;
  stackAuth: string;
}

export interface ApiEndpointSpec {
  id: string;
  method: HttpMethod;
  path: string;
  purpose: string;
  auth: AuthLevel;
  serviceId: string;
  requestShape?: string;
  responseShape?: string;
}

export interface ApiSpec {
  id: string;
  basePath: string;
  style: "rest" | "trpc";
  generatorId?: string;
  endpoints: ApiEndpointSpec[];
}

export interface ServiceMethodSpec {
  id: string;
  name: string;
  purpose: string;
  repositoryIds: string[];
  eventIds: string[];
}

export interface ServiceSpec {
  id: string;
  name: string;
  domain: string;
  responsibility: string;
  methods: ServiceMethodSpec[];
  dependencies: string[];
}

export interface RepositoryOperationSpec {
  id: string;
  name: string;
  operation: "read" | "write" | "delete" | "query";
  entity: string;
}

export interface RepositorySpec {
  id: string;
  name: string;
  entity: string;
  dataSource: string;
  operations: RepositoryOperationSpec[];
  indexes?: string[];
}

export interface EventSpec {
  id: string;
  name: string;
  topic: string;
  trigger: string;
  payloadFields: string[];
  consumers: string[];
}

export interface WorkerSpec {
  id: string;
  name: string;
  registryWorkerId?: string;
  purpose: string;
  triggers: string[];
  capabilities: string[];
  status: "planned" | "registry-linked";
}

export interface SecurityRuleSpec {
  id: string;
  rule: string;
  source: "dna" | "context" | "registry";
  enforcement: "middleware" | "service" | "infrastructure";
}

export interface SecuritySpec {
  id: string;
  oauthRequired: boolean;
  encryptDataAtRest: boolean;
  encryptDataInTransit: boolean;
  rules: SecurityRuleSpec[];
  middleware: string[];
}

export interface PermissionSpec {
  id: string;
  role: string;
  resource: string;
  actions: string[];
  scope: "global" | "org" | "self";
}

export interface JobSpec {
  id: string;
  name: string;
  queue: string;
  schedule?: string;
  trigger: "cron" | "event" | "manual";
  handler: string;
  retryPolicy: string;
}

export interface BackendBlueprintValidationIssue {
  code: string;
  message: string;
  severity: "warning" | "error";
}

export interface BackendBlueprintValidation {
  valid: boolean;
  issues: BackendBlueprintValidationIssue[];
}

export interface BackendBlueprint {
  meta: BackendBlueprintMeta;
  api: ApiSpec;
  services: ServiceSpec[];
  repositories: RepositorySpec[];
  events: EventSpec[];
  workers: WorkerSpec[];
  security: SecuritySpec;
  permissions: PermissionSpec[];
  jobs: JobSpec[];
  validation: BackendBlueprintValidation;
}

export interface BackendBuildDna {
  backendFramework: string;
  database: string;
  authProvider: string;
  architecture: string;
  ddd: boolean;
  cleanArchitecture: boolean;
  oauthRequired: boolean;
  securityRules: string[];
  complexity: "low" | "medium" | "high";
  modules: string[];
}

export interface BackendRegistryEntry {
  id: string;
  name: string;
  category: "generator" | "worker" | "provider" | "technology";
  tags: string[];
}

export interface BackendBuildRegistry {
  entries: BackendRegistryEntry[];
  backendGenerators: string[];
  backendWorkers: string[];
  preferredApiStyle: "rest" | "trpc";
}
