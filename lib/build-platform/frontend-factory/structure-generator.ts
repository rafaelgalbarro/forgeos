import type { AppStructureNode, FrontendFactoryInput } from "./types";

export function generateAppStructure(input: FrontendFactoryInput): AppStructureNode[] {
  const moduleFolders = input.dna.modules.map<AppStructureNode>((moduleName) => ({
    id: `module-${moduleName}`,
    label: moduleName,
    path: `app/(workspace)/${moduleName}`,
    kind: "folder",
  }));

  return [
    {
      id: "app-root",
      label: "App",
      path: "app",
      kind: "folder",
      children: [
        { id: "app-root-page", label: "Landing Page", path: "app/page.tsx", kind: "file" },
        { id: "app-dashboard-page", label: "Dashboard", path: "app/dashboard/page.tsx", kind: "file" },
      ],
    },
    {
      id: "app-workspace",
      label: "Workspace",
      path: "app/(workspace)",
      kind: "folder",
      children: moduleFolders,
    },
    {
      id: "components-root",
      label: "Components",
      path: "components",
      kind: "folder",
      children: [
        { id: "components-pages", label: "Page Sections", path: "components/pages", kind: "folder" },
        { id: "components-widgets", label: "Widgets", path: "components/widgets", kind: "folder" },
        { id: "components-forms", label: "Forms", path: "components/forms", kind: "folder" },
      ],
    },
  ];
}
