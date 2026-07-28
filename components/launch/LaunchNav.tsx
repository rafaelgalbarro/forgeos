"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/launch", label: "Launch" },
  { href: "/landing", label: "Inicio" },
  { href: "/beta", label: "Beta" },
  { href: "/pricing", label: "Precios" },
  { href: "/docs", label: "Docs" },
  { href: "/demo", label: "Demo" },
  { href: "/community", label: "Comunidad" },
  { href: "/status", label: "Status" },
  { href: "/support", label: "Soporte" },
];

export function LaunchNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="fhis-launch-nav">
      <Link href="/launch" className="fhis-launch-nav-brand">
        <span className="fhis-launch-nav-logo">⚒</span>
        <span>ForgeOS</span>
      </Link>
      <div className="fhis-launch-nav-links">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`fhis-launch-nav-link${pathname === link.href || pathname.startsWith(`${link.href}/`) ? " fhis-launch-nav-link-active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="fhis-launch-nav-actions">
        <Link href="/beta" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
          Beta
        </Link>
        <Link href="/os" className="fhis-btn fhis-btn-primary fhis-btn-sm">
          Entrar
        </Link>
      </div>
    </nav>
  );
}
