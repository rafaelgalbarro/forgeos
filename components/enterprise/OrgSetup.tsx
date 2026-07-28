"use client";

import { useState } from "react";
import { createOrganization } from "@/lib/enterprise/organization-engine";
import { Input } from "@/components/ui/fhis/Input";
import { Select } from "@/components/ui/fhis/Select";
import { Button } from "@/components/ui/fhis/Button";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import type { BillingPlan, EnterpriseOrganization } from "@/lib/enterprise/types";

interface OrgSetupProps {
  org?: EnterpriseOrganization;
  onComplete: () => void;
}

export function OrgSetup({ org, onComplete }: OrgSetupProps) {
  const [name, setName] = useState("Acme Ventures Demo");
  const [plan, setPlan] = useState<BillingPlan>("pro");
  const [loading, setLoading] = useState(false);

  function handleCreate() {
    setLoading(true);
    createOrganization(name, plan);
    setLoading(false);
    onComplete();
  }

  if (org) {
    return (
      <Panel className="fhis-enterprise-step">
        <div className="fhis-enterprise-step-head">
          <h3>Organización activa</h3>
          <Badge variant="accent">{org.plan}</Badge>
        </div>
        <p><strong>{org.name}</strong> · <code>{org.slug}</code></p>
        <p className="fhis-enterprise-muted">Creada: {new Date(org.createdAt).toLocaleString("es")}</p>
      </Panel>
    );
  }

  return (
    <Panel className="fhis-enterprise-step">
      <h3>1. Crear organización demo</h3>
      <p className="fhis-enterprise-muted">Multi-tenant enterprise — sandbox localStorage</p>
      <div className="fhis-enterprise-form">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <Select
          label="Plan inicial"
          value={plan}
          onChange={(e) => setPlan(e.target.value as BillingPlan)}
          options={[
            { value: "free", label: "Free" },
            { value: "pro", label: "Pro" },
            { value: "enterprise", label: "Enterprise" },
          ]}
        />
        <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>
          Crear organización
        </Button>
      </div>
    </Panel>
  );
}
