import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { CeoCard } from "@/components/ui/fhis/CeoCard";
import { Badge } from "@/components/ui/fhis/Badge";

interface CeoDirectorSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function CeoDirectorSection({ data }: CeoDirectorSectionProps) {
  const { ceoBrief } = data;
  return (
    <Panel id="ceo" className="fhis-vws-section fhis-vws-ceo">
      <SectionHeader title="Director General" subtitle="Observación ejecutiva — sin chatbot" />
      <ExecutiveCard name="Director General" role="ForgeOS Executive Office">
        <CeoCard title="Observación" subtitle="Estado actual del venture">
          <p className="fhis-vws-prose">{ceoBrief.observation}</p>
        </CeoCard>
        <CeoCard title="Recomendación" subtitle="Acción prioritaria">
          <p className="fhis-vws-prose">{ceoBrief.recommendation}</p>
        </CeoCard>
        <div className="fhis-vws-ceo-insights">
          <div className="fhis-vws-ceo-insight">
            <Badge variant="amber">Riesgo</Badge>
            <p className="fhis-vws-prose">{ceoBrief.criticalRisk}</p>
          </div>
          <div className="fhis-vws-ceo-insight">
            <Badge variant="accent">Oportunidad</Badge>
            <p className="fhis-vws-prose">{ceoBrief.opportunity}</p>
          </div>
        </div>
      </ExecutiveCard>
    </Panel>
  );
}
