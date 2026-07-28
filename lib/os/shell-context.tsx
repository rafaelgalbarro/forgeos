"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { pushNavHistory } from "./navigation-engine";
import { setActiveTab as persistActiveTab } from "./workspace-manager";
import { getOsNavItemByHref } from "./navigation";
import type { OsPanel, OsWorkspaceLayout } from "./types";
import {
  addFloatingPanel,
  closePanel,
  getWorkspaceLayout,
  togglePanelMinimized,
} from "./workspace-manager";

interface OsShellContextValue {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  layout: OsWorkspaceLayout;
  refreshLayout: () => void;
  openPanel: (panel: Omit<OsPanel, "zIndex">) => void;
  minimizePanel: (id: string) => void;
  dismissPanel: (id: string) => void;
}

const OsShellContext = createContext<OsShellContextValue | null>(null);

export function OsShellProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [layout, setLayout] = useState<OsWorkspaceLayout>(getDefaultLayout);

  function getDefaultLayout(): OsWorkspaceLayout {
    if (typeof window === "undefined") {
      return { id: "default", name: "Principal", panels: [], tabs: [] };
    }
    return getWorkspaceLayout();
  }

  const refreshLayout = useCallback(() => {
    setLayout(getWorkspaceLayout());
  }, []);

  useEffect(() => {
    const item = getOsNavItemByHref(pathname);
    const label = item?.label ?? "Vista";
    pushNavHistory(pathname, label);
    setLayout(persistActiveTab(pathname));
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openPanel = useCallback(
    (panel: Omit<OsPanel, "zIndex">) => {
      setLayout(addFloatingPanel(panel));
      if (panel.href) router.push(panel.href);
    },
    [router]
  );

  const minimizePanel = useCallback((id: string) => {
    setLayout(togglePanelMinimized(id));
  }, []);

  const dismissPanel = useCallback((id: string) => {
    setLayout(closePanel(id));
  }, []);

  const value = useMemo(
    () => ({
      commandOpen,
      setCommandOpen,
      searchOpen,
      setSearchOpen,
      notificationsOpen,
      setNotificationsOpen,
      layout,
      refreshLayout,
      openPanel,
      minimizePanel,
      dismissPanel,
    }),
    [
      commandOpen,
      searchOpen,
      notificationsOpen,
      layout,
      refreshLayout,
      openPanel,
      minimizePanel,
      dismissPanel,
    ]
  );

  return <OsShellContext.Provider value={value}>{children}</OsShellContext.Provider>;
}

export function useOsShell(): OsShellContextValue {
  const ctx = useContext(OsShellContext);
  if (!ctx) throw new Error("useOsShell must be used within OsShellProvider");
  return ctx;
}
