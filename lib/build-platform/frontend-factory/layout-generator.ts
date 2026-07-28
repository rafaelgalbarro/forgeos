import type { FrontendFactoryInput, LayoutSpec } from "./types";

export function generateLayoutPlan(input: FrontendFactoryInput): LayoutSpec[] {
  const regions =
    input.dna.preferredNavigation === "sidebar"
      ? ["sidebar", "header", "content", "aside"]
      : ["topbar", "subnav", "content", "footer"];

  return [
    {
      id: "layout-public",
      name: "Public Layout",
      shell: "public",
      regions: ["header", "content", "footer"],
    },
    {
      id: "layout-workspace",
      name: "Workspace Layout",
      shell: "workspace",
      regions,
    },
    {
      id: "layout-dashboard",
      name: "Dashboard Layout",
      shell: "dashboard",
      regions: ["header", "kpis", "charts", "timeline"],
    },
  ];
}
