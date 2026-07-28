import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { AgentVersion } from "@/lib/agents-marketplace/types";

const STATUS_LABELS: Record<AgentVersion["status"], string> = {
  stable: "Estable",
  beta: "Beta",
  deprecated: "Obsoleto",
};

interface AgentVersionHistoryProps {
  versions: AgentVersion[];
  currentVersion: string;
}

export function AgentVersionHistory({ versions, currentVersion }: AgentVersionHistoryProps) {
  return (
    <Panel>
      <SectionHeader title="Historial de versiones" subtitle={`Versión actual: v${currentVersion}`} />
      <Stack gap="sm">
        {versions.map((v) => (
          <div key={v.version} className="fhis-agent-version-row">
            <div>
              <strong>v{v.version}</strong>
              <span className="fhis-muted"> — {v.releasedAt}</span>
            </div>
            <Badge variant={v.status === "stable" ? "blue" : v.status === "beta" ? "amber" : "red"}>
              {STATUS_LABELS[v.status]}
            </Badge>
            <p>{v.changelog}</p>
          </div>
        ))}
      </Stack>
    </Panel>
  );
}
