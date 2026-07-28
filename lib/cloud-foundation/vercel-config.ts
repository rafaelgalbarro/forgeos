/** Program 4300 — Vercel environment mapping */

import {
  getVercelProjectName,
  isCloudPreviewOnly,
  isCloudProductionBlocked,
} from "./config";
import type { VercelConfig } from "./types";

export function getVercelConfig(): VercelConfig {
  const projectName = getVercelProjectName();

  return {
    projectName,
    framework: "nextjs",
    previewOnly: isCloudPreviewOnly(),
    productionBlocked: isCloudProductionBlocked(),
    buildCommand: "npm run build",
    outputDirectory: ".next",
    environments: [
      {
        environment: "development",
        vercelTarget: "development",
        branch: "develop",
        autoDeploy: false,
        domain: `dev.${projectName}.vercel.app`,
        envVarPrefix: "DEV_",
      },
      {
        environment: "preview",
        vercelTarget: "preview",
        branch: "feature/*",
        autoDeploy: true,
        domain: `preview-${projectName}.vercel.app`,
        envVarPrefix: "PREVIEW_",
      },
      {
        environment: "staging",
        vercelTarget: "preview",
        branch: "release/*",
        autoDeploy: true,
        domain: `staging.${projectName}.vercel.app`,
        envVarPrefix: "STAGING_",
      },
      {
        environment: "production",
        vercelTarget: "production",
        branch: "main",
        autoDeploy: false,
        domain: `${projectName}.vercel.app`,
        envVarPrefix: "PROD_",
      },
    ],
  };
}

export function getVercelEnvForBranch(branch: string): string {
  const config = getVercelConfig();
  for (const env of config.environments) {
    if (env.branch.endsWith("/*")) {
      const prefix = env.branch.slice(0, -2);
      if (branch.startsWith(`${prefix}/`)) return env.environment;
    } else if (branch === env.branch) {
      return env.environment;
    }
  }
  return "preview";
}
