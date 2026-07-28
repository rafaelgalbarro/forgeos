"use client";

import { useMemo } from "react";
import Link from "next/link";
import { buildOsRc2Checks, OS_RC2_ROUTES } from "@/lib/lab/os-rc2-validation-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";

export function OsRc2ValidationLab() {
  const checks = useMemo(() => buildOsRc2Checks(), []);
  const passed = checks.filter((c) => c.status === "pass").length;

  return (
    <Container className="fhis-rc2-lab">
      <SectionHeader
        title="ForgeOS OS RC2 Validation"
        subtitle="Epics 8.0–8.8 — Shell, Navigation, Desktop, Integration"
      />
      <Stack gap="lg">
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <Status status={passed === checks.length ? "success" : "warning"} label="RC2" />
            <Badge variant="accent">
              {passed}/{checks.length}
            </Badge>
            <Link href="/os" className="fhis-btn fhis-btn-primary fhis-btn-sm">
              Abrir ForgeOS OS →
            </Link>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Epic Checklist" />
          <div style={{ display: "grid", gap: 8 }}>
            {checks.map((check) => (
              <div
                key={check.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--fhis-color-border)",
                }}
              >
                <Status status={check.status === "pass" ? "success" : "warning"} label="" />
                <Badge variant="default">Epic {check.epic}</Badge>
                <span style={{ flex: 1 }}>{check.label}</span>
                {check.href && (
                  <Link href={check.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                    →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="OS Routes" subtitle={`${OS_RC2_ROUTES.length} rutas`} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OS_RC2_ROUTES.map((route) => (
              <Link key={route} href={route} className="fhis-btn fhis-btn-secondary fhis-btn-sm">
                {route}
              </Link>
            ))}
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
