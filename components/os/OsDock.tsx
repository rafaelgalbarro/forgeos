"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/design-system/cn";
import { OS_DOCK_ITEMS } from "@/lib/os";

export function OsDock() {
  const pathname = usePathname() ?? "";

  function isActive(href: string): boolean {
    if (href === "/os") return pathname === "/os";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="fhis-os-dock" aria-label="Dock">
      {OS_DOCK_ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn("fhis-os-dock-item", isActive(item.href) && "fhis-os-dock-item-active")}
          title={item.description}
        >
          <span className="fhis-os-dock-icon" aria-hidden>
            {item.icon}
          </span>
          <span className="fhis-os-dock-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
