/** Launch manager — deployment preview plan (dry-run) */

import type { IdeaProfile } from "../idea-context";
import type { DeploymentPreview } from "../types";

export function generateDeploymentPreview(profile: IdeaProfile): DeploymentPreview {
  return {
    provider: "Vercel + Supabase (preview)",
    environments: ["preview", "staging", "production"],
    steps: [
      "1. Crear repo GitHub (dry-run)",
      "2. Provision Supabase project — schema migrate",
      "3. Configurar env vars (Stripe test, DB URL)",
      "4. Deploy Vercel preview branch",
      "5. Smoke test checkout + admin",
      "6. DNS + SSL production (gated)",
    ],
    rollbackPlan: "Revert deploy + restore DB snapshot pre-migration",
    estimatedTime: profile.isPremiumGlasses ? "~45 min preview" : "~30 min preview",
  };
}
