import Link from "next/link";
/** @deprecated CEO-office legacy — NOT the FHIS ExecutiveCard in components/ui/fhis/ */
import clsx from "clsx";
import type { ExecutiveVentureCard } from "@/lib/ceo-office";
import { StatusChip } from "./StatusChip";
import { VenturePipeline } from "@/components/dashboard/VenturePipeline";

const HEALTH_VARIANT: Record<string, "healthy" | "risk" | "blocked" | "working" | "waiting"> = {
  healthy: "healthy",
  "at-risk": "risk",
  blocked: "blocked",
  operating: "working",
  scaling: "working",
};

interface ExecutiveCardProps {
  venture: ExecutiveVentureCard;
  compact?: boolean;
}

export function ExecutiveCard({ venture, compact }: ExecutiveCardProps) {
  return (
    <article className={clsx("ui-executive-card glass", compact && "ui-executive-compact")}>
      <div className="ui-exec-live-row">
        {venture.livePulses.map((pulse) => (
          <span key={pulse.id} className="ui-exec-pulse">
            <span className="ui-exec-pulse-dot" aria-hidden />
            {pulse.label}
          </span>
        ))}
      </div>

      <header className="ui-exec-header">
        <div>
          <h3>{venture.name}</h3>
          <span className="ui-exec-type">{venture.ventureType}</span>
        </div>
        <StatusChip
          label={venture.healthLabel}
          variant={HEALTH_VARIANT[venture.healthCategory] ?? "pending"}
        />
      </header>

      <div className="ui-exec-meta">
        <div>
          <span className="ui-exec-label">CEO</span>
          <span>Revisando portfolio</span>
        </div>
        <div>
          <span className="ui-exec-label">Estado</span>
          <span>{venture.lifeStageLabel}</span>
        </div>
        <div>
          <span className="ui-exec-label">Próxima decisión</span>
          <span>{venture.nextAction}</span>
        </div>
        <div>
          <span className="ui-exec-label">Impacto</span>
          <span>{venture.impactSummary}</span>
        </div>
      </div>

      {!compact && <VenturePipeline steps={venture.pipeline} />}

      <footer className="ui-exec-footer">
        <Link href={venture.nextActionData.href} className="btn btn-primary btn-sm">
          Continuar Startup
        </Link>
        <Link href={venture.href} className="btn btn-ghost btn-sm">
          Abrir ficha
        </Link>
      </footer>
    </article>
  );
}
