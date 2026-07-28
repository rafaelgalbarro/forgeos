import type { CiCdSpec, InfraFactoryInput } from "./types";

export function generateCiCdSpec(input: InfraFactoryInput): CiCdSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `cicd-${slug}`,
    provider: "github-actions",
    workflowFile: ".github/workflows/ci.yml",
    nodeVersion: "20",
    jobs: [
      {
        id: "lint",
        name: "Lint & Typecheck",
        trigger: "pull_request",
        steps: ["checkout", "setup-node", "npm ci", "npm run lint", "npx tsc --noEmit"],
        secrets: [],
      },
      {
        id: "test",
        name: "Test Suite",
        trigger: "pull_request",
        steps: ["checkout", "setup-node", "npm ci", "npm test"],
        secrets: [],
      },
      {
        id: "build",
        name: "Production Build",
        trigger: "push",
        steps: ["checkout", "setup-node", "npm ci", "npm run build"],
        secrets: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
      },
      {
        id: "deploy-preview",
        name: "Deploy Preview",
        trigger: "pull_request",
        steps: ["checkout", "setup-node", "npm ci", "vercel deploy --prebuilt"],
        secrets: ["VERCEL_TOKEN"],
      },
    ],
    environments: input.dna.environments,
    artifactOutputs: [".next", "dist", "coverage"],
  };
}
