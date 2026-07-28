"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design-system/cn";
import { buildOsBreadcrumbs, OS_NAV_ITEMS } from "@/lib/os";
import { useOsShell } from "@/lib/os/shell-context";
import { getUnreadNotificationCount } from "@/lib/os/notifications";

export function OsTopBar() {
  const pathname = usePathname() ?? "";
  const { setCommandOpen, setSearchOpen, setNotificationsOpen } = useOsShell();
  const crumbs = buildOsBreadcrumbs(pathname);
  const unread = getUnreadNotificationCount();

  return (
    <header className="fhis-os-topbar">
      <div className="fhis-os-topbar-left">
        <Link href="/os" className="fhis-os-brand">
          Forge<span>OS</span>
        </Link>
        <nav className="fhis-os-breadcrumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="fhis-os-crumb">
              {i > 0 && <span className="fhis-os-crumb-sep">/</span>}
              {c.href ? (
                <Link href={c.href}>{c.label}</Link>
              ) : (
                <span>{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="fhis-os-topbar-center">
        <button
          type="button"
          className="fhis-os-search-trigger"
          onClick={() => setSearchOpen(true)}
        >
          <span>Buscar ventures, knowledge, builds…</span>
          <kbd>Ctrl+F</kbd>
        </button>
      </div>

      <div className="fhis-os-topbar-right">
        <button
          type="button"
          className="fhis-os-icon-btn"
          onClick={() => setCommandOpen(true)}
          title="Command Palette"
        >
          ⌘K
        </button>
        <button
          type="button"
          className={cn("fhis-os-icon-btn", unread > 0 && "fhis-os-icon-btn-alert")}
          onClick={() => setNotificationsOpen(true)}
          title="Notificaciones"
        >
          🔔
          {unread > 0 && <span className="fhis-os-badge">{unread}</span>}
        </button>
        <Link href="/os/settings" className="fhis-os-avatar" title="Settings">
          R
        </Link>
      </div>
    </header>
  );
}

export function OsQuickActions() {
  const quick = OS_NAV_ITEMS.filter((i) => i.pinned).slice(0, 4);
  return (
    <div className="fhis-os-quick-actions">
      {quick.map((item) => (
        <Link key={item.id} href={item.href} className="fhis-os-quick-action">
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
