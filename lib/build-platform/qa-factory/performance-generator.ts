import type { PerformanceScenario, PerformanceSpec, QaFactoryInput } from "./types";

export function generatePerformancePlan(input: QaFactoryInput): PerformanceSpec {
  const routes = input.registry.requiredRoutes;

  const scenarios: PerformanceScenario[] = routes.map((route) => ({
    id: `perf-${route.replace(/\//g, "") || "home"}`,
    name: `Performance budget: ${route}`,
    route,
    budgets: [
      { metric: "LCP", threshold: route === "/" ? "< 2.5s" : "< 3.0s" },
      { metric: "FID", threshold: "< 100ms" },
      { metric: "CLS", threshold: "< 0.1" },
      { metric: "TTFB", threshold: "< 600ms" },
    ],
  }));

  return {
    id: "performance-main",
    tool: "lighthouse",
    scenarios,
  };
}
