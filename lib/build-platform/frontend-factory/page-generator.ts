import type { FrontendFactoryInput, PageSpec, RouteSpec } from "./types";

export function generatePagePlan(input: FrontendFactoryInput, routes: RouteSpec[]): PageSpec[] {
  const basePages: PageSpec[] = [
    {
      id: "page-home",
      title: `${input.context.meta.ventureName} Home`,
      routePath: "/",
      purpose: "Present value proposition and onboarding entry points.",
      layoutId: "layout-public",
      components: ["cmp-shell-container", "cmp-page-panel", "cmp-primary-action"],
      dataDependencies: ["build-context.discovery", "build-dna.productType"],
    },
    {
      id: "page-dashboard",
      title: "Operations Dashboard",
      routePath: "/dashboard",
      purpose: "Track progress and key operational indicators.",
      layoutId: "layout-dashboard",
      components: ["cmp-shell-container", "cmp-grid", "cmp-status"],
      dataDependencies: ["build-registry.preferredWidgets", "build-context.analytics"],
    },
  ];

  const customPages = routes
    .filter((route) => route.path !== "/" && route.path !== "/dashboard")
    .map<PageSpec>((route) => ({
      id: route.pageId,
      title: route.path.replace("/", "").replace(/-/g, " ") || "Workspace",
      routePath: route.path,
      purpose: "Generated workspace surface based on registry route requirements.",
      layoutId: route.layoutId,
      components: ["cmp-shell-container", "cmp-page-panel", "cmp-primary-action"],
      dataDependencies: ["build-context.productPrd", "build-dna.modules"],
    }));

  return [...basePages, ...customPages];
}
