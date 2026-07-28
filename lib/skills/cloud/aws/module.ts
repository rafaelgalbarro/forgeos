import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { AWS_CONFIG } from "./types";

export const awsSkill = bootstrapProvider(AWS_CONFIG);
