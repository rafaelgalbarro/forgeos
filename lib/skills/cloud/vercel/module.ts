import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { VERCEL_CONFIG } from "./types";

export const vercelSkill = bootstrapProvider(VERCEL_CONFIG);
