"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import { Switch } from "@/components/ui/fhis/Switch";
import { Notification } from "@/components/ui/fhis/Notification";
import type { ConsentScope, IntelligenceConsentRecord } from "@/lib/intelligence-network";
import {
  listConsentScopes,
  setWorkspaceConsentScope,
  grantWorkspaceConsent,
  revokeWorkspaceConsent,
  PRIVACY_DISCLAIMER_ES,
} from "@/lib/intelligence-network";

const SCOPE_LABELS: Record<ConsentScope, string> = {
  benchmarks: "Benchmarks agregados",
  signals: "Señales de mercado",
  "best-practices": "Mejores prácticas",
  trends: "Tendencias",
  opportunities: "Oportunidades",
};

interface Props {
  consent: IntelligenceConsentRecord;
  onConsentChange: (record: IntelligenceConsentRecord) => void;
}

export function PrivacyConsentBanner({ consent, onConsentChange }: Props) {
  const scopes = listConsentScopes();

  function handleToggle(scope: ConsentScope, checked: boolean) {
    const updated = setWorkspaceConsentScope(
      consent.organizationId,
      consent.workspaceId,
      scope,
      checked ? "granted" : "denied"
    );
    onConsentChange(updated);
  }

  function handleGrantAll() {
    onConsentChange(grantWorkspaceConsent(consent.organizationId, consent.workspaceId));
  }

  function handleRevokeAll() {
    onConsentChange(revokeWorkspaceConsent(consent.organizationId, consent.workspaceId));
  }

  return (
    <div>
      <Notification
        variant="warning"
        title="Privacidad y consentimiento"
        body={PRIVACY_DISCLAIMER_ES}
      />
      <Card className="fhis-network-consent" style={{ marginTop: "1rem" }}>
        <div className="fhis-network-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Consentimiento de red (localStorage)</h3>
          <Badge variant="amber">Explícito requerido</Badge>
        </div>
        <p className="fhis-network-panel-desc" style={{ margin: "0.5rem 0 1rem" }}>
          Por defecto, ningún dato sale del workspace sin tu consentimiento. Solo agregados anonimizados.
        </p>
        <ul className="fhis-network-consent-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {scopes.map((scope) => {
            const status = consent.scopes[scope];
            const granted = status === "granted";
            return (
              <li key={scope} className="fhis-network-consent-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
                <div>
                  <strong>{SCOPE_LABELS[scope]}</strong>{" "}
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
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button type="button" className="fhis-btn fhis-btn-sm" onClick={handleGrantAll}>
            Otorgar todo
          </button>
          <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={handleRevokeAll}>
            Revocar todo
          </button>
        </div>
      </Card>
    </div>
  );
}
