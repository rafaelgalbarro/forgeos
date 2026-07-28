import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { GCP_CONFIG } from "./types";

export const gcpSkill = bootstrapProvider(GCP_CONFIG);
