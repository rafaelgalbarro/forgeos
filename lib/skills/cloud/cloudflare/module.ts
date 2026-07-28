import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { CLOUDFLARE_CONFIG } from "./types";

export const cloudflareSkill = bootstrapProvider(CLOUDFLARE_CONFIG);
