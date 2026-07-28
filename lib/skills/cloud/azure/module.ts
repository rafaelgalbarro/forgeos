import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { AZURE_CONFIG } from "./types";

export const azureSkill = bootstrapProvider(AZURE_CONFIG);
