import type { ExecutiveVentureCard } from "@/lib/ceo-office";
import type { CEOBriefing } from "@/lib/portfolio";
import { CeoBriefingCard } from "@/components/dashboard/CeoBriefingCard";
import { ExecutiveCard } from "@/components/ui";
import { VenturePipeline } from "@/components/dashboard/VenturePipeline";
import { ActionButton } from "@/components/ui";
import type { SmartAction } from "@/lib/portfolio/impact-engine";

interface FocusModeOverlayProps {
  venture: ExecutiveVentureCard;
  briefing: CEOBriefing;
  smartAction: SmartAction | null;
  onExit: () => void;
}

export function FocusModeOverlay({
  venture,
  briefing,
  smartAction,
  onExit,
}: FocusModeOverlayProps) {
  return (
    <div className="ceo-focus-overlay">
      <div className="ceo-focus-bar">
        <strong>Focus Mode</strong>
        <span>{venture.name}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
          Salir de Focus Mode
        </button>
      </div>
      <div className="ceo-focus-body">
        <CeoBriefingCard briefing={briefing} />
        <ExecutiveCard venture={venture} compact />
        <section className="ceo-focus-pipeline glass">
          <h3>Pipeline</h3>
          <VenturePipeline steps={venture.pipeline} />
        </section>
        {smartAction && (
          <div className="ceo-focus-action glass">
            <h3>Próxima acción</h3>
            <p>{smartAction.label}</p>
            <p className="ceo-focus-impact">{smartAction.impact}</p>
            <ActionButton href={smartAction.href}>Continuar</ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
