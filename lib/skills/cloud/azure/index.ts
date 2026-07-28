/** Azure cloud skill — public exports (RC4.2). */

export * from "./types";
export { azureSkill } from "./module";
export { AZURE_REGISTRY } from "./registry";
export { AZURE_PERMISSIONS } from "./permissions";
export { AZURE_POLICIES } from "./policies";
export { assessAzureActionRisk } from "./risk";
export { buildAzureRollbackPlan } from "./rollback";
export { AZURE_TELEMETRY } from "./telemetry";
export { buildAzureAuditEvent } from "./audit";
export { executeAzureMock } from "./mock-executor";
export { AZURE_SANDBOX } from "./sandbox";
export { routeAzureSkill } from "./azure-adapter";
