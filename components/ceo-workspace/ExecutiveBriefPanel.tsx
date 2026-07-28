import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface ExecutiveBriefPanelProps {
  brief: string;
  confidence?: number;
  timeHorizon?: string;
}

export function ExecutiveBriefPanel({ brief, confidence, timeHorizon }: ExecutiveBriefPanelProps) {
  return (
    <Panel className="ceo-ws-panel" id="ceo-executive-brief">
      <SectionHeader
        title="Executive Brief"
        description="Síntesis ejecutiva del estado del portfolio"
      />
      <p className="ceo-ws-prose">{brief}</p>
      {(confidence != null || timeHorizon) && (
        <dl className="ceo-ws-meta-row">
          {confidence != null && (
            <>
              <dt>Confianza</dt>
              <dd>{Math.round(confidence * 100)}%</dd>
            </>
          )}
          {timeHorizon && (
            <>
              <dt>Horizonte</dt>
              <dd>{timeHorizon}</dd>
            </>
          )}
        </dl>
      )}
    </Panel>
  );
}
