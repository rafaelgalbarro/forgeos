import type { VenturePortfolioCard } from "@/lib/portfolio";
import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { WorkerCard } from "@/components/ui/fhis/WorkerCard";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { cn } from "@/lib/design-system/cn";
import type { FhisStatus } from "@/lib/design-system/types";
import { VenturePipeline } from "./VenturePipeline";

interface VenturePortfolioCardProps {
  venture: VenturePortfolioCard;
}

const BADGE_VARIANT: Record<VenturePortfolioCard["statusBadge"], "default" | "blue" | "amber" | "accent"> = {
  idea: "default",
  validando: "blue",
  build: "amber",
  launch: "accent",
  operando: "accent",
};

function workerStatus(status: VenturePortfolioCard["aiTeam"][number]["status"]): FhisStatus {
  if (status === "listo") return "success";
  if (status === "bloqueado") return "error";
  if (status === "pendiente") return "pending";
  return "active";
}

function ScoreBlock({
  label,
  score,
}: {
  label: string;
  score: VenturePortfolioCard["startupScore"];
}) {
  return (
    <div>
      <KpiBlock
        label={label}
        value={score.display}
        className={cn(score.pending && "fhis-vpc-score-pending")}
      />
      <span className="fhis-vpc-score-label">{score.label}</span>
    </div>
  );
}

export function VenturePortfolioCardView({ venture }: VenturePortfolioCardProps) {
  return (
    <Panel className="fhis-vpc-card">
      <div className="fhis-vpc-banner">
        <span className="fhis-vpc-pulse" aria-hidden />
        <span>ForgeOS está trabajando en esta empresa</span>
      </div>

      <div className="fhis-vpc-global">
        <span className="fhis-vpc-global-label">Estado global</span>
        <Status status="active" label={venture.currentState} />
      </div>

      <Link href={venture.href} className="fhis-vpc-link">
        <header className="fhis-vpc-header">
          <div>
            <h3>{venture.name}</h3>
            <span className="fhis-vpc-type">{venture.ventureType}</span>
          </div>
          <Badge variant={BADGE_VARIANT[venture.statusBadge]}>
            {venture.statusBadgeLabel}
          </Badge>
        </header>

        <p className="fhis-vpc-desc">{venture.shortDescription}</p>

        <div className="fhis-vpc-life-row">
          <span style={{ color: "var(--fhis-color-text-muted)" }}>Estado de vida</span>
          <span style={{ fontWeight: 600 }}>{venture.lifeStageLabel}</span>
        </div>

        <VenturePipeline steps={venture.pipeline} />

        <div className="fhis-vpc-scores">
          <ScoreBlock label="Startup Score" score={venture.startupScore} />
          <ScoreBlock label="Venture Score" score={venture.ventureScore} />
          <div>
            <span className="fhis-vpc-score-name">Confianza</span>
            <span className="fhis-vpc-score-value fhis-vpc-score-muted">{venture.confidenceLabel}</span>
            <span className="fhis-vpc-score-label">Nivel de contexto</span>
          </div>
          <div>
            <span className="fhis-vpc-score-name">Actualización</span>
            <span className="fhis-vpc-score-value fhis-vpc-score-muted">{venture.lastUpdatedRelative}</span>
            <span className="fhis-vpc-score-label">Última actividad</span>
          </div>
        </div>

        <div className="fhis-vpc-ai-team">
          <span className="fhis-vpc-ai-title">Equipo IA</span>
          <div className="fhis-vpc-ai-chips">
            {venture.aiTeam.map((member) => (
              <WorkerCard
                key={member.role}
                name={member.role}
                role={member.statusLabel}
                status={workerStatus(member.status)}
              />
            ))}
          </div>
        </div>
      </Link>

      <footer className="fhis-vpc-footer">
        <div>
          <span className="fhis-vpc-next-label">Próxima acción</span>
          <span className="fhis-vpc-next-action">{venture.nextAction}</span>
        </div>
        <Link href={venture.nextActionData.href} className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
          Continuar Startup
        </Link>
      </footer>
    </Panel>
  );
}
