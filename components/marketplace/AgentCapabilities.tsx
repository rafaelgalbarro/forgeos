import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { AgentCapability, RegistryEntry } from "@/lib/agents-marketplace/types";

const USAGE_LABELS: Record<RegistryEntry["usage"], string> = {
  primary: "Principal",
  secondary: "Secundaria",
  optional: "Opcional",
};

interface AgentCapabilitiesProps {
  capabilities: AgentCapability[];
  skills: RegistryEntry[];
}

export function AgentCapabilities({ capabilities, skills }: AgentCapabilitiesProps) {
  return (
    <Stack gap="md">
      <Panel>
        <SectionHeader title="Capacidades" subtitle="Funciones que el agente puede ejecutar" />
        <ul className="fhis-agent-cap-list">
          {capabilities.map((cap) => (
            <li key={cap.id} className="fhis-agent-cap-item">
              <strong>{cap.label}</strong>
              <span className="fhis-muted">{cap.description}</span>
              <Badge variant="default">{cap.category}</Badge>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionHeader title="Skills utilizadas" subtitle="Referencias al registro de skills (solo lectura)" />
        <ul className="fhis-agent-skill-list">
          {skills.map((skill) => (
            <li key={skill.skillId} className="fhis-agent-skill-item">
              <code>{skill.skillId}</code>
              <span>{skill.skillName}</span>
              <Badge variant="blue">{skill.category}</Badge>
              <Badge variant="default">{USAGE_LABELS[skill.usage]}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </Stack>
  );
}
