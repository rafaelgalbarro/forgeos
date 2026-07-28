import type { PlaywrightScenario, PlaywrightSpec, QaFactoryInput } from "./types";

export function generatePlaywrightPlan(input: QaFactoryInput): PlaywrightSpec {
  const routes = input.registry.requiredRoutes;
  const ventureName = input.context.meta.ventureName;

  const baseScenarios: PlaywrightScenario[] = [
    {
      id: "pw-home",
      name: "Home page loads and displays value proposition",
      route: "/",
      steps: [
        `Navigate to /`,
        `Verify page title contains "${ventureName}"`,
        "Verify primary CTA is visible and enabled",
      ],
      assertions: [
        "Page responds with HTTP 200",
        "No console errors on load",
        "Primary navigation is visible",
      ],
    },
    {
      id: "pw-dashboard",
      name: "Dashboard renders operational widgets",
      route: "/dashboard",
      steps: [
        "Authenticate as test operator",
        "Navigate to /dashboard",
        "Wait for dashboard widgets to load",
      ],
      assertions: [
        "At least one KPI widget is visible",
        "Status indicators render without error",
        "No unhandled network failures",
      ],
    },
  ];

  const routeScenarios = routes
    .filter((route) => route !== "/" && route !== "/dashboard")
    .map<PlaywrightScenario>((route) => ({
      id: `pw-${route.replace(/\//g, "").replace(/-/g, "-") || "workspace"}`,
      name: `Workspace route ${route} is accessible`,
      route,
      steps: [
        "Authenticate as test operator",
        `Navigate to ${route}`,
        "Verify page shell and content region render",
      ],
      assertions: [
        "Page responds with HTTP 200",
        "No layout shift blocking interaction",
        "Breadcrumb or nav highlights active route",
      ],
    }));

  return {
    id: "playwright-main",
    framework: "playwright",
    configPath: "tests/e2e/playwright.config.ts",
    scenarios: [...baseScenarios, ...routeScenarios],
    browsers: ["chromium", "firefox", "webkit"],
  };
}
