import type { DockerSpec, InfraFactoryInput } from "./types";

export function generateDockerSpec(input: InfraFactoryInput): DockerSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");
  const dbProvider = input.dna.database.toLowerCase();

  const services = [
    {
      id: "app",
      name: "app",
      image: `node:20-alpine`,
      ports: ["3000:3000"],
      envKeys: ["NODE_ENV", "DATABASE_URL", "NEXT_PUBLIC_APP_URL"],
      dependsOn: dbProvider.includes("postgres") ? ["db"] : [],
    },
  ];

  if (dbProvider.includes("postgres") || dbProvider.includes("supabase")) {
    services.push({
      id: "db",
      name: "db",
      image: "postgres:16-alpine",
      ports: ["5432:5432"],
      envKeys: ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"],
      dependsOn: [],
    });
  }

  return {
    id: `docker-${slug}`,
    baseImage: "node:20-alpine",
    composeVersion: "3.9",
    services,
    volumes: ["app-data:/var/lib/postgresql/data"],
    networks: ["forgeos-net"],
    buildStages: ["deps", "builder", "runner"],
    healthChecks: [`http://localhost:3000/api/health`],
  };
}
