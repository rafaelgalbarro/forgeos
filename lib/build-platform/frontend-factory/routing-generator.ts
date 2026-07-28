import type { FrontendFactoryInput, RouteSpec } from "./types";

export function generateRoutingPlan(input: FrontendFactoryInput): RouteSpec[] {
  const routes: RouteSpec[] = [
    {
      id: "route-home",
      path: "/",
      pageId: "page-home",
      layoutId: "layout-public",
      surface: "app",
      auth: "public",
    },
    {
      id: "route-dashboard",
      path: "/dashboard",
      pageId: "page-dashboard",
      layoutId: "layout-dashboard",
      surface: "dashboard",
      auth: "protected",
    },
  ];

  for (const entry of input.registry.requiredRoutes) {
    const normalized = entry.startsWith("/") ? entry : `/${entry}`;
    routes.push({
      id: `route-${normalized.replace(/\W+/g, "-")}`,
      path: normalized,
      pageId: `page-${normalized.replace(/\W+/g, "-")}`,
      layoutId: "layout-workspace",
      surface: "app",
      auth: "protected",
    });
  }

  return routes;
}
