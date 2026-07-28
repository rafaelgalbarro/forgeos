import type { AwsSpec, InfraFactoryInput } from "./types";

export function generateAwsSpec(input: InfraFactoryInput): AwsSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `aws-${slug}`,
    adapter: "aws",
    region: "eu-west-1",
    resources: [
      {
        id: "ecs-cluster",
        service: "ECS",
        name: `${slug}-cluster`,
        purpose: "Container orchestration for app services",
        configKeys: ["clusterName", "capacityProviders"],
      },
      {
        id: "rds-instance",
        service: "RDS",
        name: `${slug}-postgres`,
        purpose: "Managed PostgreSQL database",
        configKeys: ["instanceClass", "allocatedStorage", "multiAz"],
      },
      {
        id: "s3-bucket",
        service: "S3",
        name: `${slug}-assets`,
        purpose: "Static assets and file uploads",
        configKeys: ["bucketName", "versioning", "lifecycleRules"],
      },
      {
        id: "cloudfront",
        service: "CloudFront",
        name: `${slug}-cdn`,
        purpose: "CDN for static assets",
        configKeys: ["origins", "cacheBehaviors", "priceClass"],
      },
    ],
    iamRoles: [`${slug}-ecs-task-role`, `${slug}-lambda-execution-role`],
    envKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    secretsManagerKeys: ["database-url", "api-keys"],
  };
}
