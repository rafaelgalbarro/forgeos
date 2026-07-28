"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runEnterpriseLab, seedEnterpriseLab, type EnterpriseLabSnapshot } from "@/lib/lab/enterprise-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Button } from "@/components/ui/fhis/Button";
import { EnterpriseDashboardView } from "./EnterpriseDashboardView";

export function EnterpriseLabView() {
  const [lab, setLab] = useState<EnterpriseLabSnapshot | null>(null);

  function refresh() {
    setLab(runEnterpriseLab());
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Container className="fhis-enterprise-lab">
      <Stack gap="lg">
        <SectionHeader
          title="Enterprise Lab — RC11"
          subtitle="Harness de ingeniería y validación enterprise"
        />

        {lab && (
          <Panel>
            <div className="fhis-enterprise-kpi-grid">
              <KpiBlock label="Roles RBAC" value={String(lab.roles.length)} />
              <KpiBlock label="Planes" value={String(lab.plans.length)} />
              <KpiBlock label="Permisos" value={String(lab.permissions.length)} />
              <KpiBlock label="Compliance" value={`${lab.compliance.score}%`} />
              <KpiBlock label="Security" value={`${lab.security.score}%`} />
              <KpiBlock label="Modo" value="dry-run" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <Button size="sm" onClick={() => { seedEnterpriseLab(); refresh(); }}>Seed demo</Button>
              <Link href="/enterprise" className="fhis-btn fhis-btn-primary fhis-btn-sm">Abrir /enterprise →</Link>
              <Link href="/admin" className="fhis-btn fhis-btn-secondary fhis-btn-sm">Abrir /admin →</Link>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Badge variant="default">SSO: {lab.sso.status}</Badge>
              <Badge variant="default">SCIM: {lab.scim.status}</Badge>
              <Badge variant="accent">{lab.dryRunOnly ? "Sandbox only" : "Live"}</Badge>
            </div>
          </Panel>
        )}

        <EnterpriseDashboardView />
      </Stack>
    </Container>
  );
}
