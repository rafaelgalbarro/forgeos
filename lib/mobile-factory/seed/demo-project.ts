/** Program 4600 — Demo mobile project seed/fixture. */

import type { MobileProject } from "../types";
import { createInitialSteps } from "../wizard";
import { getTemplateById } from "../templates";
import { generateNavigation } from "../navigation-generator";
import { generateScreens } from "../screens-generator";
import { generateAuthFlow } from "../auth-generator";
import { generateApiIntegration } from "../api-integration";
import { generateProjectStructure } from "../project-structure";
import { generateExpoPreview } from "../preview";
import { createPlatformBuild } from "../build-status";

export const DEMO_PROJECT_ID = "mf-demo-fitpulse";

export function createDemoMobileProject(): MobileProject {
  const template = getTemplateById("fitness")!;
  const name = "FitPulse";
  const idea = "App de fitness con rutinas personalizadas, tracking de progreso y comunidad.";
  const now = new Date().toISOString();

  const navigation = generateNavigation(template, name);
  const screens = generateScreens(template, navigation);
  const auth = generateAuthFlow(template, "fitpulse");
  const api = generateApiIntegration(template, "fitpulse", screens);
  const structure = generateProjectStructure(template, "fitpulse", screens);
  const preview = generateExpoPreview(name, DEMO_PROJECT_ID);

  const steps = createInitialSteps().map((s) => ({
    ...s,
    status:
      s.id === "complete"
        ? ("pending" as const)
        : ("success" as const),
    summary:
      s.id === "idea"
        ? idea
        : s.id === "template"
          ? template.name
          : undefined,
  }));

  return {
    id: DEMO_PROJECT_ID,
    name,
    idea,
    templateId: template.id,
    createdAt: now,
    updatedAt: now,
    currentStep: "preview",
    steps,
    navigation,
    screens,
    auth,
    api,
    structure,
    preview,
    androidBuild: createPlatformBuild("android"),
    iosBuild: createPlatformBuild("ios"),
    completed: false,
  };
}
