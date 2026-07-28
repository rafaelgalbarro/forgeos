"use client";

import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Badge } from "@/components/ui/fhis/Badge";
import { computeAdminMetrics } from "@/lib/commercial";

export function AdminCommercialDashboard() {
  const metrics = computeAdminMetrics();

  return (
    <Container className="fhis-commercial-admin">
      <Stack gap="lg">
        <SectionHeader
          title="Métricas comerciales"
          subtitle={`Program 6000 · Actualizado ${metrics.asOf.slice(0, 16)}`}
        />

        <div className="fhis-enterprise-kpi-grid">
          <KpiBlock label="MRR" value={`€${metrics.mrr}`} />
          <KpiBlock label="ARR" value={`€${metrics.arr}`} />
          <KpiBlock label="Clientes" value={String(metrics.customers)} />
          <KpiBlock label="Revenue (6m)" value={`€${metrics.revenue}`} />
          <KpiBlock label="Trials activos" value={String(metrics.activeTrials)} />
          <KpiBlock label="Conversiones" value={String(metrics.conversions)} />
          <KpiBlock label="Churn" value={`${(metrics.churnRate * 100).toFixed(0)}%`} />
        </div>

        <Panel>
          <h3>Clientes por plan</h3>
          <Grid cols={4} gap="md">
            {Object.entries(metrics.usageByPlan).map(([plan, count]) => (
              <div key={plan}>
                <Badge variant="default">{plan}</Badge>
                <p style={{ fontSize: "1.5rem", margin: "8px 0 0" }}>{count}</p>
              </div>
            ))}
          </Grid>
        </Panel>
      </Stack>
    </Container>
  );
}
