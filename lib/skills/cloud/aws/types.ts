/** AWS cloud skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const AWS_CONFIG: ProviderModuleConfig = {
  id: "aws",
  name: "AWS",
  category: "cloud",
  provider: "amazon",
  capability: "cloud_ops",
  credential: "AWS_ACCESS_KEY_ID",
  risks: ["cloud_cost", "infra_change"],
  actions: [
    { id: "create_ec2", name: "Create EC2", risk: "HIGH" },
    { id: "create_s3_bucket", name: "Create S3 Bucket", risk: "MEDIUM" },
    { id: "deploy_lambda", name: "Deploy Lambda", risk: "HIGH" },
    { id: "list_resources", name: "List Resources", risk: "LOW" },
    { id: "delete_resource", name: "Delete Resource", risk: "CRITICAL" },
  ],
  mockData: (action, ctx) => ({
    provider: "amazon",
    action,
    ventureId: ctx.ventureId,
    region: "us-east-1",
    resourceId: `aws-mock-${action}-${ctx.ventureId}`,
    sandbox: true,
  }),
};

export type AwsAction = (typeof AWS_CONFIG.actions)[number]["id"];
