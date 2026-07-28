import type {
  FrontendBlueprint,
  FrontendBlueprintValidation,
  FrontendBlueprintValidationIssue,
  FrontendFactoryInput,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: FrontendBlueprintValidationIssue["severity"] = "warning"
): FrontendBlueprintValidationIssue {
  return { code, message, severity };
}

export function validateFrontendFactoryInput(input: FrontendFactoryInput): void {
  if (!input.context?.meta?.ventureId) {
    throw new Error("FrontendFactoryInput.context.meta.ventureId is required");
  }

  if (!input.dna?.productType) {
    throw new Error("FrontendFactoryInput.dna.productType is required");
  }

  if (!input.registry || !Array.isArray(input.registry.entries)) {
    throw new Error("FrontendFactoryInput.registry.entries must be an array");
  }
}

export function validateFrontendBlueprint(
  blueprint: Omit<FrontendBlueprint, "validation">
): FrontendBlueprintValidation {
  const issues: FrontendBlueprintValidationIssue[] = [];

  if (blueprint.routes.length === 0) {
    issues.push(issue("ROUTES_EMPTY", "No routes were generated", "error"));
  }

  if (blueprint.pages.length === 0) {
    issues.push(issue("PAGES_EMPTY", "No page specs were generated", "error"));
  }

  if (blueprint.layouts.length === 0) {
    issues.push(issue("LAYOUTS_EMPTY", "No layout specs were generated", "error"));
  }

  if (blueprint.components.length === 0) {
    issues.push(issue("COMPONENTS_EMPTY", "No FHIS component mapping was generated", "error"));
  }

  if (!blueprint.routes.some((route) => route.path === "/dashboard")) {
    issues.push(issue("DASHBOARD_ROUTE_MISSING", "Dashboard route is recommended"));
  }

  if (!blueprint.navigation.some((item) => item.routePath === "/")) {
    issues.push(issue("NAV_HOME_MISSING", "Navigation should include a home route"));
  }

  return {
    valid: issues.every((current) => current.severity !== "error"),
    issues,
  };
}
