"use client";

import Link from "next/link";
import { RC1_NAV_LINKS } from "@/lib/rc1-integration/routes";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";

export function Rc1NavLinks({ compact = false }: { compact?: boolean }) {
  const groups = ["founder", "venture", "build", "lab"] as const;

  return (
    <Panel className="rc1-nav-panel">
      <SectionHeader
        title="RC1 Integration"
        subtitle={compact ? undefined : "Cross-links entre módulos ForgeOS"}
      />
      <Stack gap={compact ? "sm" : "lg"}>
        {groups.map((group) => {
          const links = RC1_NAV_LINKS.filter((l) => l.group === group);
          if (links.length === 0) return null;
          return (
            <div key={group}>
              {!compact && (
                <span className="rc1-nav-group-label" style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.6 }}>
                  {group}
                </span>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}
                    title={link.description}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </Stack>
    </Panel>
  );
}

export function Rc1QuickStart() {
  return (
    <Container>
      <SectionHeader
        title="VANDL Quick Start"
        subtitle="Recorrido E2E del venture de referencia RC1"
      />
      <Grid cols={2}>
        <Panel>
          <h3 style={{ margin: "0 0 8px" }}>Flujo VANDL</h3>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Idea → <Link href="/founder">Founder</Link></li>
            <li>Research → <Link href={`/venture/${VANDL_VENTURE_ID}/knowledge`}>Knowledge</Link></li>
            <li>CEO → <Link href="/ceo">CEO Workspace</Link></li>
            <li>Board → <Link href="/founder-journey">Founder Journey</Link></li>
            <li>Product → <Link href={`/venture/${VANDL_VENTURE_ID}`}>Venture Workspace</Link></li>
            <li>Build → <Link href="/lab/build-context">Build Platform Labs</Link></li>
            <li>Release → <Link href="/lab/rc1">RC1 Validation</Link></li>
          </ol>
        </Panel>
        <Panel>
          <Badge variant="accent">RC1</Badge>
          <p style={{ marginTop: 12 }}>
            VANDL (Vandalism &amp; Asset Notification Detection Layer) es el venture canónico para validar
            la integración end-to-end de ForgeOS RC1.
          </p>
        </Panel>
      </Grid>
    </Container>
  );
}
