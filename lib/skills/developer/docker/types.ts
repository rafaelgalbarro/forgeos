/** Docker developer skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const DOCKER_CONFIG: ProviderModuleConfig = {
  id: "docker",
  name: "Docker",
  category: "cicd",
  provider: "docker",
  capability: "container_ops",
  credential: "DOCKER_TOKEN",
  risks: ["external_api", "infra_change"],
  actions: [
    { id: "build_image", name: "Build Image", risk: "MEDIUM" },
    { id: "push_image", name: "Push Image", risk: "MEDIUM" },
    { id: "run_container", name: "Run Container", risk: "HIGH" },
    { id: "stop_container", name: "Stop Container", risk: "MEDIUM" },
    { id: "list_containers", name: "List Containers", risk: "LOW" },
    { id: "inspect_container", name: "Inspect Container", risk: "LOW" },
  ],
  mockData: (action, ctx) => ({
    provider: "docker",
    action,
    ventureId: ctx.ventureId,
    image: `forgeos/${ctx.ventureId}:latest`,
    container: action.includes("container") ? { id: "ctr-mock-001", status: "running" } : undefined,
    sandbox: true,
  }),
};

export type DockerAction = (typeof DOCKER_CONFIG.actions)[number]["id"];
