"use client";

import { useState } from "react";
import Link from "next/link";
import { getActiveOrganization } from "@/lib/enterprise/organization-engine";
import { listUsers } from "@/lib/enterprise/user-engine";
import { listTeams } from "@/lib/enterprise/team-engine";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/enterprise/api-keys";
import { listWebhooks, createWebhook, WEBHOOK_EVENTS } from "@/lib/enterprise/webhooks";
import { getSecurityPosture, enableMfaStub } from "@/lib/enterprise/security-center";
import { configureSsoStub } from "@/lib/enterprise/sso-engine";
import { enableScimStub } from "@/lib/enterprise/scim-engine";
import { getComplianceChecklist, getComplianceScore } from "@/lib/enterprise/compliance-engine";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

export function AdminConsoleView() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const org = getActiveOrganization();
  const users = org ? listUsers(org.id) : [];
  const teams = org ? listTeams(org.id) : [];
  const apiKeys = org ? listApiKeys(org.id) : [];
  const webhooks = org ? listWebhooks(org.id) : [];
  const security = getSecurityPosture(org?.id);
  const compliance = getComplianceChecklist(org?.id);
  const complianceScore = getComplianceScore(compliance);

  return (
    <Container className="fhis-enterprise fhis-enterprise-admin">
      <Stack gap="lg">
        <div className="fhis-enterprise-header">
          <SectionHeader
            title="Admin Console"
            subtitle="Gestión enterprise — usuarios, seguridad, API keys (demo)"
          />
          <Link href="/enterprise" className="fhis-btn fhis-btn-ghost fhis-btn-sm">← Enterprise</Link>
        </div>

        {!org && (
          <Panel>
            <p>No hay organización activa. <Link href="/enterprise">Crear en Enterprise →</Link></p>
          </Panel>
        )}

        {org && (
          <>
            <div className="fhis-enterprise-kpi-grid">
              <KpiBlock label="Usuarios" value={String(users.length)} />
              <KpiBlock label="Equipos" value={String(teams.length)} />
              <KpiBlock label="API Keys" value={String(apiKeys.filter((k) => k.status === "active").length)} />
              <KpiBlock label="Compliance" value={`${complianceScore}%`} />
            </div>

            <Panel>
              <h3>Security Center</h3>
              <div className="fhis-enterprise-kpi-grid" style={{ marginTop: 12 }}>
                <KpiBlock label="Score" value={`${security.score}%`} />
                <KpiBlock label="MFA" value={security.mfaEnabled ? "Sí" : "No"} />
                <KpiBlock label="SSO" value={security.ssoReady ? "Ready" : "No"} />
                <KpiBlock label="SCIM" value={security.scimReady ? "Ready" : "No"} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Button size="sm" variant="secondary" onClick={() => { enableMfaStub(); refresh(); }}>Habilitar MFA</Button>
                <Button size="sm" variant="secondary" onClick={() => { configureSsoStub(); refresh(); }}>Configurar SSO (stub)</Button>
                <Button size="sm" variant="secondary" onClick={() => { enableScimStub(); refresh(); }}>Habilitar SCIM (stub)</Button>
              </div>
            </Panel>

            <Panel>
              <div className="fhis-enterprise-step-head">
                <h3>API Keys</h3>
                <Button size="sm" onClick={() => { createApiKey("Demo Key"); refresh(); }}>Crear key</Button>
              </div>
              {apiKeys.length === 0 ? (
                <p className="fhis-enterprise-muted">Sin API keys</p>
              ) : (
                <div className="fhis-enterprise-list">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="fhis-enterprise-list-item">
                      <span><code>{k.prefix}</code> — {k.name}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge variant={k.status === "active" ? "accent" : "default"}>{k.status}</Badge>
                        {k.status === "active" && (
                          <Button size="sm" variant="danger" onClick={() => { revokeApiKey(k.id); refresh(); }}>Revocar</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <div className="fhis-enterprise-step-head">
                <h3>Webhooks</h3>
                <Button size="sm" onClick={() => { createWebhook("https://hooks.demo.forgeos.app/events", [...WEBHOOK_EVENTS]); refresh(); }}>
                  Crear webhook demo
                </Button>
              </div>
              {webhooks.length === 0 ? (
                <p className="fhis-enterprise-muted">Sin webhooks</p>
              ) : (
                <div className="fhis-enterprise-list">
                  {webhooks.map((w) => (
                    <div key={w.id} className="fhis-enterprise-list-item">
                      <code>{w.url}</code>
                      <Badge variant="default">{w.events.length} eventos</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <h3>Cumplimiento GDPR / SOC2</h3>
              <div className="fhis-enterprise-list">
                {compliance.map((c) => (
                  <div key={c.id} className="fhis-enterprise-list-item">
                    <span>
                      <Badge variant="default">{c.framework.toUpperCase()}</Badge> {c.label}
                    </span>
                    <Badge variant={c.status === "ready" ? "accent" : c.status === "partial" ? "default" : "default"}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
      </Stack>
    </Container>
  );
}
