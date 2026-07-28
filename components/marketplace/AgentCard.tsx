import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import type { AgentCatalogItem } from "@/lib/agents-marketplace/types";

const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  installed: "Instalado",
  beta: "Beta",
  "coming-soon": "Próximamente",
  deprecated: "Obsoleto",
};

const STATUS_VARIANT: Record<string, "default" | "accent" | "blue" | "amber" | "red"> = {
  available: "blue",
  installed: "accent",
  beta: "amber",
  "coming-soon": "default",
  deprecated: "red",
};

interface AgentCardProps {
  agent: AgentCatalogItem;
}

export function AgentCard({ agent }: AgentCardProps) {
  const displayStatus = agent.installState === "installed" ? "installed" : agent.status;

  return (
    <Link href={`/marketplace/agents/${agent.slug}`} className="fhis-agent-card card">
      <div className="fhis-agent-card-header">
        <span className="fhis-agent-icon" aria-hidden>{agent.icon}</span>
        <div>
          <h3>{agent.name}</h3>
          <p className="fhis-agent-role">{agent.role}</p>
        </div>
        <Badge variant={STATUS_VARIANT[displayStatus] ?? "default"}>
          {STATUS_LABELS[displayStatus] ?? displayStatus}
        </Badge>
      </div>
      <p className="fhis-agent-desc">{agent.description}</p>
      <div className="fhis-agent-meta">
        <span>v{agent.latestVersion.version}</span>
        <span>{agent.estimatedCostPerMonth} €/mes est.</span>
        <span>{agent.recommendedProvider}</span>
      </div>
      <div className="fhis-agent-tags">
        {agent.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="default">{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}
