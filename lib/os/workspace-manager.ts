/** ForgeOS OS — workspace manager: panels, tabs, layouts (RC2). */

import type { OsPanel, OsTab, OsWorkspaceLayout } from "./types";

const LAYOUT_KEY = "forgeos-os-workspace-layout";

const DEFAULT_TABS: OsTab[] = [
  { id: "tab-home", label: "Home", href: "/os", active: true },
  { id: "tab-ceo", label: "CEO", href: "/os/ceo", active: false },
];

const DEFAULT_PANELS: OsPanel[] = [
  {
    id: "panel-main",
    title: "Workspace",
    moduleId: "home",
    href: "/os",
    minimized: false,
    zIndex: 1,
  },
];

export function getDefaultWorkspaceLayout(): OsWorkspaceLayout {
  return {
    id: "default",
    name: "Principal",
    panels: DEFAULT_PANELS,
    tabs: DEFAULT_TABS,
  };
}

function readLayout(): OsWorkspaceLayout {
  if (typeof window === "undefined") return getDefaultWorkspaceLayout();
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return getDefaultWorkspaceLayout();
    return JSON.parse(raw) as OsWorkspaceLayout;
  } catch {
    return getDefaultWorkspaceLayout();
  }
}

function writeLayout(layout: OsWorkspaceLayout): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function getWorkspaceLayout(): OsWorkspaceLayout {
  return readLayout();
}

export function setActiveTab(href: string): OsWorkspaceLayout {
  const layout = readLayout();
  const tabs = layout.tabs.map((t) => ({ ...t, active: t.href === href }));
  const hasTab = tabs.some((t) => t.href === href);
  const nextTabs = hasTab
    ? tabs
    : [...tabs, { id: `tab-${Date.now()}`, label: "Vista", href, active: true }].map((t, i, arr) => ({
        ...t,
        active: t.href === href,
      }));

  const next = { ...layout, tabs: nextTabs.slice(-8) };
  writeLayout(next);
  return next;
}

export function addFloatingPanel(panel: Omit<OsPanel, "zIndex">): OsWorkspaceLayout {
  const layout = readLayout();
  const maxZ = layout.panels.reduce((m, p) => Math.max(m, p.zIndex), 0);
  const next = {
    ...layout,
    panels: [...layout.panels, { ...panel, zIndex: maxZ + 1 }],
  };
  writeLayout(next);
  return next;
}

export function togglePanelMinimized(panelId: string): OsWorkspaceLayout {
  const layout = readLayout();
  const next = {
    ...layout,
    panels: layout.panels.map((p) =>
      p.id === panelId ? { ...p, minimized: !p.minimized } : p
    ),
  };
  writeLayout(next);
  return next;
}

export function closePanel(panelId: string): OsWorkspaceLayout {
  const layout = readLayout();
  const next = {
    ...layout,
    panels: layout.panels.filter((p) => p.id !== panelId),
  };
  writeLayout(next);
  return next;
}

export const DESKTOP_WIDGETS = [
  { id: "w-ceo", type: "ceo" as const, title: "CEO", colSpan: 2 as const },
  { id: "w-tasks", type: "tasks" as const, title: "Tasks", colSpan: 1 as const },
  { id: "w-build", type: "build" as const, title: "Build", colSpan: 1 as const },
  { id: "w-portfolio", type: "portfolio" as const, title: "Portfolio", colSpan: 1 as const },
  { id: "w-timeline", type: "timeline" as const, title: "Timeline", colSpan: 1 as const },
  { id: "w-calendar", type: "calendar" as const, title: "Calendar", colSpan: 1 as const },
];
