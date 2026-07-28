"use client";

import { useState } from "react";
import Link from "next/link";
import { getActiveOrganization } from "@/lib/enterprise/organization-engine";
import { getBillingSummary, listPlans, changePlan } from "@/lib/enterprise/billing-engine";
import { getSubscription, canUpgrade, canDowngrade } from "@/lib/enterprise/subscription-engine";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { BillingPlan } from "@/lib/enterprise/types";

export function BillingView() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const org = getActiveOrganization();
  const billing = getBillingSummary(org?.id);
  const subscription = getSubscription(org?.id);
  const plans = listPlans();

  function handleChangePlan(plan: BillingPlan) {
    changePlan(plan);
    refresh();
  }

  return (
    <Container className="fhis-enterprise fhis-enterprise-billing">
      <Stack gap="lg">
        <div className="fhis-enterprise-header">
          <SectionHeader
            title="Facturación"
            subtitle="Planes mock — free, pro, enterprise (sin proveedor real)"
          />
          <Link href="/enterprise" className="fhis-btn fhis-btn-ghost fhis-btn-sm">← Enterprise</Link>
        </div>

        {!org && (
          <Panel>
            <p>No hay organización activa. <Link href="/enterprise">Crear en Enterprise →</Link></p>
          </Panel>
        )}

        {org && billing && subscription && (
          <>
            <div className="fhis-enterprise-kpi-grid">
              <KpiBlock label="Plan actual" value={billing.plan.label} />
              <KpiBlock label="Precio/mes" value={`${billing.monthlyTotal} ${billing.currency}`} />
              <KpiBlock label="Asientos" value={`${billing.seatsUsed}/${billing.seatsAvailable}`} />
              <KpiBlock label="Renovación" value={billing.nextInvoiceDate} />
            </div>

            <Panel>
              <h3>Suscripción</h3>
              <p>Estado: <Badge variant="accent">{subscription.status}</Badge></p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {canUpgrade(org.plan) && (
                  <Button size="sm" onClick={() => handleChangePlan(canUpgrade(org.plan)!)}>
                    Upgrade a {canUpgrade(org.plan)}
                  </Button>
                )}
                {canDowngrade(org.plan) && (
                  <Button size="sm" variant="secondary" onClick={() => handleChangePlan(canDowngrade(org.plan)!)}>
                    Downgrade a {canDowngrade(org.plan)}
                  </Button>
                )}
              </div>
            </Panel>

            <div className="fhis-enterprise-plans-grid">
              {plans.map((p) => (
                <Panel key={p.id} className={org.plan === p.id ? "fhis-enterprise-plan--active" : ""}>
                  <div className="fhis-enterprise-step-head">
                    <h3>{p.label}</h3>
                    {org.plan === p.id && <Badge variant="accent">Actual</Badge>}
                  </div>
                  <p className="fhis-enterprise-plan-price">
                    {p.monthlyPrice === 0 ? "Gratis" : `${p.monthlyPrice} EUR/mes`}
                  </p>
                  <ul className="fhis-enterprise-plan-features">
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {org.plan !== p.id && (
                    <Button size="sm" variant="secondary" onClick={() => handleChangePlan(p.id)}>
                      Cambiar a {p.label}
                    </Button>
                  )}
                </Panel>
              ))}
            </div>
          </>
        )}
      </Stack>
    </Container>
  );
}
