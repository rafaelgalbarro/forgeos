"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design-system/cn";
import { OS_NAV_ITEMS } from "@/lib/os";
import { Status } from "@/components/ui/fhis/Status";

export function OsSidebar() {
  const pathname = usePathname() ?? "";

  function isActive(href: string): boolean {
    if (href === "/os") return pathname === "/os";
    if (href === "/investment") {
      return pathname === "/investment" || pathname.startsWith("/investment/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="fhis-os-sidebar">
      <p className="fhis-os-sidebar-kicker">Sistema Operativo</p>

      <Link href="/command-center" className="fhis-os-sidebar-cta">
        ⌘ Command Center
      </Link>

      <Link href="/os/creator" className="fhis-os-sidebar-cta" style={{ marginTop: 8 }}>
        + Crear Empresa
      </Link>

      <nav className="fhis-os-nav">
        <Link
          href="/os"
          className={cn("fhis-os-nav-link", pathname === "/os" && "fhis-os-nav-link-active")}
        >
          <span aria-hidden>⌂</span>
          Home
        </Link>
        {OS_NAV_ITEMS.map((item) => {
          const isInvestment = item.id === "investment";
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn("fhis-os-nav-link", isActive(item.href) && "fhis-os-nav-link-active")}
              style={
                isInvestment
                  ? {
                      borderLeft: "2px solid #f8b84e",
                      paddingLeft: 10,
                      color: isActive(item.href) ? "#f8b84e" : undefined,
                    }
                  : undefined
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="fhis-os-sidebar-footer">
        <div className="fhis-os-ceo-pill">
          <Status status="active" label="" />
          <div>
            <strong>CEO AI</strong>
            <span>Director General activo</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
