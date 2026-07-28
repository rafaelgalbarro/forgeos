import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { DOCKER_CONFIG } from "./types";

export const dockerSkill = bootstrapProvider(DOCKER_CONFIG);
