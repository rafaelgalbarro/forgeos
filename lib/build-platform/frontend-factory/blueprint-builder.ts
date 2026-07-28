import { generateFhisComponentPlan } from "./component-generator";
import { generateDashboardPlan } from "./dashboard-generator";
import { generateFormPlan } from "./form-generator";
import { generateLayoutPlan } from "./layout-generator";
import { generateNavigationPlan } from "./navigation-generator";
import { generatePagePlan } from "./page-generator";
import { generateRoutingPlan } from "./routing-generator";
import { generateAppStructure } from "./structure-generator";
import type { FrontendBlueprint, FrontendFactoryInput } from "./types";
import { generateWidgetPlan } from "./widget-generator";

export function buildFrontendBlueprint(
  input: FrontendFactoryInput
): Omit<FrontendBlueprint, "validation"> {
  const routes = generateRoutingPlan(input);
  const layouts = generateLayoutPlan(input);
  const components = generateFhisComponentPlan(input);
  const pages = generatePagePlan(input, routes);
  const navigation = generateNavigationPlan(input, routes);
  const forms = generateFormPlan(input);
  const widgets = generateWidgetPlan(input);
  const dashboards = generateDashboardPlan(input);

  return {
    meta: {
      ventureId: input.context.meta.ventureId,
      ventureName: input.context.meta.ventureName,
      generatedAt: new Date().toISOString(),
      version: "6.3.0",
      status: "draft",
    },
    appStructure: generateAppStructure(input),
    routes,
    layouts,
    components,
    pages,
    navigation,
    forms,
    dashboards,
    widgets,
  };
}
