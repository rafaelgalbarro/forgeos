import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { SUPABASE_CONFIG } from "./types";

export const supabaseSkill = bootstrapProvider(SUPABASE_CONFIG);
