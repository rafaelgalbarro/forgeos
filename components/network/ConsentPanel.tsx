"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import { Switch } from "@/components/ui/fhis/Switch";
import type { ConsentScope, OrgConsentRecord } from "@/lib/network/types";
import { listConsentScopes, setConsentScope } from "@/lib/network";

const SCOPE_LABELS: Record<ConsentScope, string> = {
  benchmarks: "Benchmarks agregados",
  signals: "Señales de mercado",
  "best-practices": "Mejores prácticas",
  trends: "Tendencias",
  opportunities: "Oportunidades",
};

interface Props {
  consent: OrgConsentRecord;
  onUpdate: (record: OrgConsentRecord) => void;
}

export function ConsentPanel({ consent, onUpdate }: Props) {
  const scopes = listConsentScopes();

  function handleToggle(scope: ConsentScope, checked: boolean) {
    const updated = setConsentScope(
      consent.organizationId,
      scope,
      checked ? "granted" : "denied"
    );
    onUpdate(updated);
  }

  return (
    <Card className="fhis-network-consent">
      <div className="fhis-network-panel-header">
        <h3>Consentimiento de red</h3>
        <Badge variant="amber">Explícito requerido</Badge>
      </div>
      <p className="fhis-network-panel-desc">
        Controla qué datos anonimizados puede contribuir tu organización a la red colectiva.
        Sin consentimiento, solo recibes insights agregados.
      </p>
      <ul className="fhis-network-consent-list">
        {scopes.map((scope) => {
          const status = consent.scopes[scope];
          const granted = status === "granted";
          return (
            <li key={scope} className="fhis-network-consent-item">
              <div>
                <strong>{SCOPE_LABELS[scope]}</strong>
                <Badge variant={granted ? "accent" : "default"}>
                  {granted ? "Otorgado" : status === "denied" ? "Denegado" : "Pendiente"}
                </Badge>
              </div>
              <Switch
                checked={granted}
                onChange={(checked) => handleToggle(scope, checked)}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
