import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { GITLAB_CONFIG } from "./types";

export const gitlabSkill = bootstrapProvider(GITLAB_CONFIG);
