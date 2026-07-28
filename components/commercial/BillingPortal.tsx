"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import {
  canDowngradeTo,
  canUpgradeTo,
  ensureSubscription,
  getBillingPortalData,
  getStripeMode,
  requestDowngrade,
  requestUpgrade,
  getTrialDaysRemaining,
} from "@/lib/commercial";
import type { CommercialPlanId } from "@/lib/commercial";
import { LaunchNav } from "@/components/launch/LaunchNav";

export function BillingPortal() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  ensureSubscription();
  const data = getBillingPortalData();
  const trialDays = getTrialDaysRemaining(data.orgId);

  async function handleUpgrade(planId: CommercialPlanId) {
    await requestUpgrade(planId, data.orgId);
    refresh();
  }

  function handleDowngrade(planId: CommercialPlanId) {
    requestDowngrade(planId, data.orgId);
    refresh();
  }

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <Container className="fhis-enterprise fhis-enterprise-billing">
        <Stack gap="lg">
          <div className="fhis-enterprise-header">
            <SectionHeader
              title="Portal de facturación"
              subtitle={`Modo ${getStripeMode()} · Program 6000`}
            />
            <Link href="/subscriptions" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Suscripciones →
            </Link>
          </div>

          {trialDays !== null && (
            <Panel>
              <Badge variant="accent">Trial activo</Badge>
              <p>Quedan {trialDays} días de prueba.</p>
            </Panel>
          )}

          <div className="fhis-enterprise-kpi-grid">
            <KpiBlock label="Plan actual" value={data.plan?.name ?? "—"} />
            <KpiBlock label="Precio" value={data.priceLabel} />
            <KpiBlock
              label="Asientos"
              value={`${data.license?.seatsUsed ?? 0}/${data.license?.seatsTotal ?? 0}`}
            />
            <KpiBlock
              label="Renovación"
              value={data.subscription?.currentPeriodEnd.slice(0, 10) ?? "—"}
            />
          </div>

          <Panel>
            <h3>Uso del periodo</h3>
            <ul>
              {data.usage.map((u) => (
                <li key={u.id}>
                  {u.label}: {u.used}/{u.limit === 999999 ? "∞" : u.limit} {u.unit}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <h3>Facturas recientes</h3>
            {data.invoices.length === 0 ? (
              <p>Sin facturas aún.</p>
            ) : (
              <ul>
                {data.invoices.map((inv) => (
                  <li key={inv.id}>
                    {inv.number} — €{inv.amount} — <Badge variant="default">{inv.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <h3>Cambiar plan</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {(["starter", "pro", "business", "enterprise"] as CommercialPlanId[]).map((pid) => (
                <Button
                  key={pid}
                  size="sm"
                  variant={data.subscription?.planId === pid ? "primary" : "secondary"}
                  onClick={() => {
                    const current = data.subscription?.planId ?? "starter";
                    if (canUpgradeTo(current, pid)) handleUpgrade(pid);
                    else if (canDowngradeTo(current, pid)) handleDowngrade(pid);
                  }}
                  disabled={data.subscription?.planId === pid}
                >
                  {pid}
                </Button>
              ))}
            </div>
          </Panel>

          {data.notifications.length > 0 && (
            <Panel>
              <h3>Notificaciones</h3>
              <ul>
                {data.notifications.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <strong>{n.title}</strong> — {n.message}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </Stack>
      </Container>
    </div>
  );
}
