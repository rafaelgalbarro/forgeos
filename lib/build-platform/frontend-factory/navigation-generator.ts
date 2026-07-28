import type { FrontendFactoryInput, NavigationItemSpec, RouteSpec } from "./types";

function pickIcon(path: string): string {
  if (path === "/") return "home";
  if (path.includes("dashboard")) return "chart";
  if (path.includes("settings")) return "settings";
  if (path.includes("admin")) return "shield";
  return "grid";
}

export function generateNavigationPlan(
  _input: FrontendFactoryInput,
  routes: RouteSpec[]
): NavigationItemSpec[] {
  return routes.map((route) => ({
    id: `nav-${route.id}`,
    label: route.path === "/" ? "Inicio" : route.path.slice(1).replace(/-/g, " "),
    routePath: route.path,
    icon: pickIcon(route.path),
    visibility: route.path === "/" ? "public" : route.surface === "dashboard" ? "dashboard" : "workspace",
  }));
}
