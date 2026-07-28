"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import {
  getInstallState,
  installAgent,
  uninstallAgent,
} from "@/lib/agents-marketplace/agent-install";
import type { InstallState } from "@/lib/agents-marketplace/types";

interface AgentInstallPanelProps {
  agentId: string;
  agentName: string;
  version: string;
}

export function AgentInstallPanel({ agentId, agentName, version }: AgentInstallPanelProps) {
  const [state, setState] = useState<InstallState>("not-installed");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(getInstallState(agentId));
  }, [agentId]);

  const handleInstall = useCallback(() => {
    setBusy(true);
    setState("installing");
    setTimeout(() => {
      installAgent(agentId, version);
      setState("installed");
      setBusy(false);
    }, 400);
  }, [agentId, version]);

  const handleUninstall = useCallback(() => {
    setBusy(true);
    setState("uninstalling");
    setTimeout(() => {
      uninstallAgent(agentId);
      setState("not-installed");
      setBusy(false);
    }, 300);
  }, [agentId]);

  const isInstalled = state === "installed";

  return (
    <Panel>
      <SectionHeader title="Instalación" subtitle="Registro local — no ejecuta IA nueva" />
      <Stack gap="sm">
        <p className="fhis-muted">
          Instalar <strong>{agentName}</strong> registra el agente en localStorage.
          No despliega runtime ni ejecuta tareas de IA.
        </p>
        <div className="fhis-agent-install-status">
          <Badge variant={isInstalled ? "accent" : "default"}>
            {isInstalled ? "Instalado" : "No instalado"}
          </Badge>
          {isInstalled && <span className="fhis-muted">v{version}</span>}
        </div>
        <div className="fhis-agent-install-actions">
          {!isInstalled ? (
            <button
              type="button"
              className="fhis-btn fhis-btn-primary"
              onClick={handleInstall}
              disabled={busy}
            >
              {busy ? "Instalando…" : "Instalar agente"}
            </button>
          ) : (
            <button
              type="button"
              className="fhis-btn fhis-btn-secondary"
              onClick={handleUninstall}
              disabled={busy}
            >
              {busy ? "Desinstalando…" : "Desinstalar"}
            </button>
          )}
        </div>
      </Stack>
    </Panel>
  );
}
