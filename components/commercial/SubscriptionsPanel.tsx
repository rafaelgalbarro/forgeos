"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  cancelSubscription,
  ensureSubscription,
  getSubscription,
  getTrialDaysRemaining,
  startTrial,
  getPlan,
  getDowngradeOptions,
  getUpgradeOptions,
} from "@/lib/commercial";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { UpgradeFlowModal } from "./UpgradeFlowModal";
import type { CommercialPlanId } from "@/lib/commercial";

export function SubscriptionsPanel() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [upgradePlan, setUpgradePlan] = useState<CommercialPlanId | null>(null);

  ensureSubscription();
  const sub = getSubscription();
  const plan = sub ? getPlan(sub.planId) : null;
  const trialDays = getTrialDaysRemaining();

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <Container>
        <Stack gap="lg">
          <SectionHeader
            title="Mi suscripción"
            subtitle="Estado, trial y cambios de plan"
          />

          {sub && plan && (
            <>
              <Panel>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2>{plan.name}</h2>
                    <p>{plan.tagline}</p>
                  </div>
                  <Badge variant="accent">{sub.status}</Badge>
                </div>
                <p style={{ marginTop: 12 }}>
                  Periodo: {sub.currentPeriodStart.slice(0, 10)} → {sub.currentPeriodEnd.slice(0, 10)}
                </p>
                {trialDays !== null && <p>Trial: {trialDays} días restantes</p>}
                {sub.cancelAtPeriodEnd && (
                  <Badge variant="amber">Cancelación programada al fin del periodo</Badge>
                )}
              </Panel>

              <Panel>
                <h3>Acciones</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {getUpgradeOptions(sub.planId).map((pid) => (
                    <Button key={pid} size="sm" onClick={() => setUpgradePlan(pid)}>
                      Upgrade a {getPlan(pid)?.name}
                    </Button>
                  ))}
                  {sub.status !== "trialing" && (
                    <Button size="sm" variant="secondary" onClick={() => { startTrial("pro"); refresh(); }}>
                      Iniciar trial Pro (14 días)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { cancelSubscription(sub.orgId); refresh(); }}
                  >
                    Cancelar suscripción
                  </Button>
                </div>
              </Panel>

              {getDowngradeOptions(sub.planId).length > 0 && (
                <Panel>
                  <h3>Downgrade disponible</h3>
                  <p>
                    Planes inferiores: {getDowngradeOptions(sub.planId).join(", ")}.{" "}
                    <Link href="/billing">Gestionar en billing →</Link>
                  </p>
                </Panel>
              )}
            </>
          )}
        </Stack>
      </Container>

      {upgradePlan && (
        <UpgradeFlowModal planId={upgradePlan} onClose={() => { setUpgradePlan(null); refresh(); }} />
      )}
    </div>
  );
}
