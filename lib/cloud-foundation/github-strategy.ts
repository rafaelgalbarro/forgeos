/** Program 4300 — GitHub branch strategy */

import { getGitHubOrg, getGitHubRepo } from "./config";
import type { GitHubStrategy } from "./types";

export function getGitHubStrategy(): GitHubStrategy {
  const org = getGitHubOrg();
  const repo = getGitHubRepo();

  return {
    defaultBranch: "main",
    branches: [
      {
        pattern: "main",
        type: "main",
        protected: true,
        deployTarget: "production",
        description: `Rama principal — ${org}/${repo} — solo releases aprobados`,
      },
      {
        pattern: "develop",
        type: "develop",
        protected: true,
        deployTarget: "staging",
        description: "Integración continua — despliegue a staging",
      },
      {
        pattern: "release/*",
        type: "release",
        protected: true,
        deployTarget: "staging",
        description: "Ramas de release — candidatos a producción",
      },
      {
        pattern: "feature/*",
        type: "feature",
        protected: false,
        deployTarget: "preview",
        description: "Features — preview automático en Vercel",
      },
      {
        pattern: "hotfix/*",
        type: "hotfix",
        protected: true,
        deployTarget: "production",
        description: "Hotfixes críticos — merge directo a main tras aprobación",
      },
    ],
    prRequired: true,
    requireStatusChecks: true,
    statusChecks: ["build", "lint", "typecheck", "production-readiness"],
    releaseBranchPattern: "release/*",
    featureBranchPattern: "feature/*",
  };
}

export function getBranchDeployTarget(branch: string): string | undefined {
  const strategy = getGitHubStrategy();
  for (const rule of strategy.branches) {
    if (rule.pattern.endsWith("/*")) {
      const prefix = rule.pattern.slice(0, -2);
      if (branch.startsWith(`${prefix}/`)) return rule.deployTarget;
    } else if (branch === rule.pattern) {
      return rule.deployTarget;
    }
  }
  return "preview";
}
