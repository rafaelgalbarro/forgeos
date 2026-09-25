"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design-system/cn";
import { Status } from "@/components/ui/fhis/Status";
import {
  getSystemSidebarItem,
  getVisibleAdvancedSidebarItems,
  getVisiblePrimarySidebarItems,
  getVisibleSecondarySidebarItems,
  isNavActive,
} from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const primaryNav = getVisiblePrimarySidebarItems();
  const secondaryNav = getVisibleSecondarySidebarItems();
  const advancedNav = getVisibleAdvancedSidebarItems();
  const createVenture = getSystemSidebarItem("create-venture");
  const forgeOsLink = getSystemSidebarItem("forgeos-os");

  const investmentItem = primaryNav.find((i) => i.id === "investment");
  const otherPrimary = primaryNav.filter((i) => i.id !== "investment");

  return (
    <aside className={cn("sidebar", "sidebar-os", "fhis-sidebar")}>
      <Link href="/" className="fhis-sidebar-logo">
        Forge<span>OS</span>
      </Link>
      <p className="fhis-sidebar-tagline">Venture Studio</p>

      {createVenture && (
        <Link href={createVenture.href} className="fhis-sidebar-cta">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {createVenture.label}
        </Link>
      )}

      <p className="fhis-sidebar-tagline" style={{ marginTop: 8, fontSize: 10, letterSpacing: "0.08em" }}>
        PRINCIPAL
      </p>
      <nav className="fhis-nav">
        {otherPrimary.map((item) => (
          <div key={item.id}>
            <Link
              href={item.href}
              className={cn("fhis-nav-link", isNavActive(pathname, item.href) && "fhis-nav-link-active")}
            >
              <span className="fhis-nav-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
            {item.children && isNavActive(pathname, item.href) && (
              <div className="fhis-nav" style={{ paddingLeft: 12 }}>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "fhis-nav-link",
                      isNavActive(pathname, child.href) && "fhis-nav-link-active",
                    )}
                    style={{ fontSize: 12 }}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {investmentItem && (
        <>
          <p
            className="fhis-sidebar-tagline"
            style={{
              marginTop: 16,
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "#f8b84e",
            }}
          >
            ForgeOS Investment
          </p>
          <nav className="fhis-nav" aria-label="ForgeOS Investment">
            <Link
              href={investmentItem.href}
              className={cn(
                "fhis-nav-link",
                isNavActive(pathname, investmentItem.href) && "fhis-nav-link-active",
              )}
              style={{
                borderLeft: "2px solid #f8b84e",
                paddingLeft: 10,
              }}
            >
              <span className="fhis-nav-icon" aria-hidden>
                {investmentItem.icon}
              </span>
              ForgeOS Investment
            </Link>
            <div className="fhis-nav" style={{ paddingLeft: 8 }}>
              {(investmentItem.children ?? []).map((child) => {
                const childActive =
                  child.href === "/investment"
                    ? pathname === "/investment" || pathname === "/investment/"
                    : isNavActive(pathname, child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn("fhis-nav-link", childActive && "fhis-nav-link-active")}
                    style={{
                      fontSize: 12,
                      color: childActive ? "#f8b84e" : undefined,
                    }}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}

      {advancedNav.length > 0 && (
        <>
          <p className="fhis-sidebar-tagline" style={{ marginTop: 16, fontSize: 10, letterSpacing: "0.08em" }}>
            ADVANCED
          </p>
          <nav className="fhis-nav">
            {advancedNav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn("fhis-nav-link", isNavActive(pathname, item.href) && "fhis-nav-link-active")}
              >
                <span className="fhis-nav-icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}

      <p className="fhis-sidebar-tagline" style={{ marginTop: 16, fontSize: 10, letterSpacing: "0.08em" }}>
        MÁS
      </p>
      <nav className="fhis-nav">
        {secondaryNav.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn("fhis-nav-link", isNavActive(pathname, item.href) && "fhis-nav-link-active")}
          >
            <span className="fhis-nav-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="fhis-sidebar-footer">
        <div className="fhis-sidebar-ceo-pill">
          <Status status="active" label="" />
          <div>
            <strong>CEO AI</strong>
            <span>Trabajando</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: "var(--fhis-color-text-muted)", padding: "0 4px" }}>
          Equipo ejecutivo activo
        </span>
        {forgeOsLink && (
          <Link
            href={forgeOsLink.href}
            className={cn("fhis-nav-link", isNavActive(pathname, forgeOsLink.href) && "fhis-nav-link-active")}
            style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}
          >
            <span className="fhis-nav-icon" aria-hidden>
              {forgeOsLink.icon}
            </span>
            {forgeOsLink.label}
          </Link>
        )}
      </div>
    </aside>
  );
}
