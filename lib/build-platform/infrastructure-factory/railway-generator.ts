import type { InfraFactoryInput, RailwaySpec } from "./types";

export function generateRailwaySpec(input: InfraFactoryInput): RailwaySpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `railway-${slug}`,
    adapter: "railway",
    projectName: slug,
    services: [
      {
        id: "web",
        name: "web",
        source: "Dockerfile",
        healthcheckPath: "/api/health",
        envKeys: ["PORT", "DATABASE_URL", "NODE_ENV"],
      },
      {
        id: "worker",
        name: "background-worker",
        source: "Dockerfile.worker",
        healthcheckPath: "/health",
        envKeys: ["REDIS_URL", "QUEUE_CONCURRENCY"],
      },
    ],
    volumes: ["postgres-data"],
    envKeys: ["RAILWAY_TOKEN", "RAILWAY_PROJECT_ID"],
  };
}
