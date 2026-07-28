/** AWS cloud skill — public exports (RC4.2). */

export * from "./types";
export { awsSkill } from "./module";
export { AWS_REGISTRY } from "./registry";
export { AWS_PERMISSIONS } from "./permissions";
export { AWS_POLICIES } from "./policies";
export { assessAwsActionRisk } from "./risk";
export { buildAwsRollbackPlan } from "./rollback";
export { AWS_TELEMETRY } from "./telemetry";
export { buildAwsAuditEvent } from "./audit";
export { executeAwsMock } from "./mock-executor";
export { AWS_SANDBOX } from "./sandbox";
export { routeAwsSkill } from "./aws-adapter";
