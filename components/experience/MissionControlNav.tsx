"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MissionControlNav({
  missionId,
  ventureId,
}: {
  missionId?: string | null;
  ventureId?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const missionHref = missionId ? `/missions/${missionId}` : "/mission-control";
  const studioHref = missionId ? `/studio/${missionId}` : "/studio";
  const companyHref = ventureId ? `/company/${ventureId}` : "/company";

  const items = [
    { id: "mission", label: "Mission", href: missionHref, match: (p: string) => p.startsWith("/mission") },
    { id: "studio", label: "Studio", href: studioHref, match: (p: string) => p.startsWith("/studio") },
    { id: "review", label: "Review", href: "/review", match: (p: string) => p.startsWith("/review") },
    { id: "company", label: "Company", href: companyHref, match: (p: string) => p.startsWith("/company") },
  ] as const;

  return (
    <nav className="mc-nav" aria-label="Mission Control sections">
      {items.map((item) => {
        const current = item.match(pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            className="mc-nav-link"
            aria-current={current ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
