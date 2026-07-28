"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { markJourneyMilestoneFromPath } from "@/lib/founder-journey/journey-manager";
import { computeJourneyProgress } from "@/lib/founder-journey/progress-tracker";
import { resolveLegacyRedirect, getUnifiedJourneyLinks } from "@/lib/founder-journey/redirects";
import { ProgressTracker } from "./ProgressTracker";

interface FounderJourneyShellProps {
  children: React.ReactNode;
  showBanner?: boolean;
  showProgress?: boolean;
}

export function FounderJourneyShell({
  children,
  showBanner = true,
  showProgress = false,
}: FounderJourneyShellProps) {
  const pathname = usePathname() ?? "";
  const legacy = resolveLegacyRedirect(pathname);
  const progress = computeJourneyProgress();
  const links = getUnifiedJourneyLinks();

  useEffect(() => {
    markJourneyMilestoneFromPath(pathname);
  }, [pathname]);

  return (
    <div className="fhis-fj-shell">
      {showBanner && legacy && (
        <Panel className="fhis-fj-legacy-banner">
          <Badge variant="accent">{legacy.label}</Badge>
          <p>{legacy.reason}</p>
          <Link href={legacy.to} className="fhis-btn fhis-btn-sm fhis-btn-primary">
            Ir al recorrido unificado →
          </Link>
        </Panel>
      )}

      {showProgress && (
        <Container>
          <ProgressTracker progress={progress} compact />
        </Container>
      )}

      {children}

      {showBanner && !legacy && pathname !== "/onboarding" && (
        <footer className="fhis-fj-footer">
          <Container>
            <nav className="fhis-fj-nav" aria-label="Recorrido fundador">
              {links.map((l) => (
                <Link key={l.href} href={l.href} title={l.description}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </Container>
        </footer>
      )}
    </div>
  );
}
