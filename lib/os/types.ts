/** ForgeOS OS — core types (RC2). */

export type OsModuleId =
  | "home"
  | "ceo"
  | "portfolio"
  | "workspace"
  | "creator"
  | "build"
  | "knowledge"
  | "capital"
  | "marketplace"
  | "analytics"
  | "calendar"
  | "settings"
  | "labs"
  | "investment";

export type OsNotificationSource =
  | "ceo"
  | "build"
  | "research"
  | "workers"
  | "board"
  | "capital"
  | "deployment"
  | "investment";

export interface OsNavItem {
  id: OsModuleId;
  label: string;
  href: string;
  description: string;
  icon: string;
  pinned?: boolean;
}

export interface OsBreadcrumb {
  label: string;
  href?: string;
}

export interface OsSearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  category:
    | "venture"
    | "research"
    | "knowledge"
    | "worker"
    | "build"
    | "deployment"
    | "timeline"
    | "capital"
    | "settings"
    | "shortcut"
    | "investment";
}

export interface OsCommand {
  id: string;
  label: string;
  description?: string;
  href?: string;
  action?: "search" | "create-venture" | "launch-build";
  keywords?: string[];
  group: "navigate" | "create" | "search" | "execute";
}

export interface OsNotification {
  id: string;
  source: OsNotificationSource;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  at: string;
}

export interface OsPanel {
  id: string;
  title: string;
  moduleId: OsModuleId;
  href: string;
  minimized: boolean;
  zIndex: number;
}

export interface OsTab {
  id: string;
  label: string;
  href: string;
  active: boolean;
}

export interface OsWorkspaceLayout {
  id: string;
  name: string;
  panels: OsPanel[];
  tabs: OsTab[];
}

export interface OsWidget {
  id: string;
  type: "ceo" | "tasks" | "build" | "portfolio" | "timeline" | "calendar" | "investment";
  title: string;
  colSpan: 1 | 2;
}

export interface OsCeoHomeBlock {
  kind: "greeting" | "absence" | "research" | "marketing" | "build" | "board" | "today";
  text: string;
}

export interface OsCeoHomeData {
  founderName: string;
  blocks: OsCeoHomeBlock[];
}
