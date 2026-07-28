/** ForgeOS Real Connections — Vercel types (RC5). */

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  framework?: string;
}

export interface VercelDeploymentPlan {
  project: string;
  target: "preview" | "production";
  envVars: string[];
}
