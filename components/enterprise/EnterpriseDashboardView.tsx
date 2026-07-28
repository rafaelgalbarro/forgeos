"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getActiveOrganization } from "@/lib/enterprise/organization-engine";
import { getDemoFlowState, runFullDemoFlow, DEMO_STEPS } from "@/lib/enterprise/demo-flow";
import { getSecurityPosture } from "@/lib/enterprise/security-center";
import { getBillingSummary } from "@/lib/enterprise/billing-engine";
import { listUsers } from "@/lib/enterprise/user-engine";
import { listTeams } from "@/lib/enterprise/team-engine";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Button } from "@/components/ui/fhis/Button";
import { OrgSetup } from "./OrgSetup";
import { TeamRoles } from "./TeamRoles";
import { PermissionsMatrix } from "./PermissionsMatrix";
import { UsageMeter } from "./UsageMeter";
import { AuditLogTable } from "./AuditLogTable";

export function EnterpriseDashboardView() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    setTick((t) => t + 1);
  }, []);

  const org = getActiveOrganization();
  const flow = getDemoFlowState();
  const security = getSecurityPosture(org?.id);
  const billing = getBillingSummary(org?.id);
  const users = org ? listUsers(org.id) : [];
  const teams = org ? listTeams(org.id) : [];

  return (
    <Container className="fhis-enterprise">
      <Stack gap="lg">
        <div className="fhis-enterprise-header">
          <SectionHeader
            title="ForgeOS Enterprise"
            subtitle="RC11 — Multi-tenant, RBAC, auditoría y facturación (demo sandbox)"
          />
          <div className="fhis-enterprise-header-actions">
            <Badge variant="accent">Sandbox</Badge>
            <Button size="sm" variant="secondary" onClick={() => { runFullDemoFlow(); refresh(); }}>
              Ejecutar demo completo
            </Button>
            <Link href="/admin" className="fhis-btn fhis-btn-ghost fhis-btn-sm">Admin →</Link>
            <Link href="/billing" className="fhis-btn fhis-btn-ghost fhis-btn-sm">Billing →</Link>
          </div>
        </div>

        <div className="fhis-enterprise-kpi-grid">
          <KpiBlock label="Organización" value={org?.name ?? "—"} />
          <KpiBlock label="Plan" value={org?.plan ?? "—"} />
          <KpiBlock label="Usuarios" value={String(users.length)} />
          <KpiBlock label="Equipos" value={String(teams.length)} />
          <KpiBlock label="Security Score" value={`${security.score}%`} />
          <KpiBlock label="Facturación" value={billing ? `${billing.monthlyTotal} ${billing.currency}` : "—"} />
        </div>

        <Panel>
          <h3>Flujo demo obligatorio</h3>
          <div className="fhis-enterprise-steps-nav">
            {DEMO_STEPS.map((s) => (
              <Badge key={s.id} variant="default">{s.label}</Badge>
            ))}
          </div>
        </Panel>

        <OrgSetup org={org} onComplete={refresh} />
        <TeamRoles org={org} onComplete={refresh} />
        <PermissionsMatrix />
        <UsageMeter org={org} />
        <AuditLogTable org={org} />

        {billing && (
          <Panel className="fhis-enterprise-step">
            <h3>6. Plan y facturación</h3>
            <p><strong>{billing.plan.label}</strong> — {billing.monthlyTotal} {billing.currency}/mes</p>
            <p className="fhis-enterprise-muted">
              Asientos: {billing.seatsUsed} / {billing.seatsAvailable} · Próxima factura: {billing.nextInvoiceDate}
            </p>
            <Link href="/billing" className="fhis-btn fhis-btn-primary fhis-btn-sm" style={{ marginTop: 12 }}>
              Ver facturación completa →
            </Link>
          </Panel>
        )}

        <p className="fhis-enterprise-muted">
          Progreso demo: paso {flow.step} · {flow.auditCount} eventos de auditoría
        </p>
      </Stack>
    </Container>
  );
}
