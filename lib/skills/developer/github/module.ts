/** GitHub developer skill — bootstrapped module (RC4.2). */

import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { GITHUB_CONFIG } from "./types";

export const githubSkill = bootstrapProvider(GITHUB_CONFIG);
