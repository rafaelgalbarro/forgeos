import { generateAwsSpec } from "./aws-generator";
import { generateAzureSpec } from "./azure-generator";
import { generateCloudflareSpec } from "./cloudflare-generator";
import { generateDockerSpec } from "./docker-generator";
import { generateGcpSpec } from "./gcp-generator";
import { generateCiCdSpec } from "./github-actions-generator";
import { generateRailwaySpec } from "./railway-generator";
import { generateSupabaseSpec } from "./supabase-generator";
import type { InfraBlueprint, InfraFactoryInput } from "./types";
import { generateVercelSpec } from "./vercel-generator";

export function buildInfraBlueprint(
  input: InfraFactoryInput
): Omit<InfraBlueprint, "validation"> {
  return {
    meta: {
      ventureId: input.context.meta.ventureId,
      ventureName: input.context.meta.ventureName,
      generatedAt: new Date().toISOString(),
      version: "6.7.0",
      status: "draft",
      primaryDeployment: input.dna.deployment,
      cicdProvider: input.dna.cicd,
      databaseProvider: input.dna.database,
    },
    docker: generateDockerSpec(input),
    cicd: generateCiCdSpec(input),
    vercel: generateVercelSpec(input),
    cloudflare: generateCloudflareSpec(input),
    supabase: generateSupabaseSpec(input),
    railway: generateRailwaySpec(input),
    aws: generateAwsSpec(input),
    azure: generateAzureSpec(input),
    gcp: generateGcpSpec(input),
  };
}
