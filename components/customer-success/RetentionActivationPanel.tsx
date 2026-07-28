"use client";

import { useEffect, useState } from "react";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import {
  getRetentionMetrics,
  getActivationMetrics,
  getExpansionMetrics,
} from "@/lib/customer-success";

export function RetentionActivationPanel() {
  const [retention, setRetention] = useState(getRetentionMetrics());
  const [activation, setActivation] = useState(getActivationMetrics());
  const [expansion, setExpansion] = useState(getExpansionMetrics());

  useEffect(() => {
    setRetention(getRetentionMetrics());
    setActivation(getActivationMetrics());
    setExpansion(getExpansionMetrics());
  }, []);

  return (
    <Grid cols={3} gap="md" className="fhis-beta-kpi-grid">
      <Panel className="fhis-beta-kpi">
        <KpiBlock label="Retención" value={`${retention.rate}%`} />
        <p className="fhis-beta-signup-hint">
          {retention.returningUsers} de {retention.cohortSize} recurrentes
        </p>
      </Panel>
      <Panel className="fhis-beta-kpi">
        <KpiBlock label="Activación" value={`${activation.rate}%`} />
        <p className="fhis-beta-signup-hint">
          {activation.completed}/{activation.started} completaron venture
        </p>
      </Panel>
      <Panel className="fhis-beta-kpi">
        <KpiBlock label="Expansión" value={`${expansion.rate}%`} />
        <p className="fhis-beta-signup-hint">
          {expansion.upsellSignals} señales de upsell
        </p>
      </Panel>
    </Grid>
  );
}
