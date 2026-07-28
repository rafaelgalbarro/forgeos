import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface ResearchSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function ResearchSection({ data }: ResearchSectionProps) {
  const { research } = data;
  return (
    <Panel id="research" className="fhis-vws-section">
      <SectionHeader title="Research" subtitle="Inteligencia de mercado y competencia" />
      {research.hasContent ? (
        <>
          {research.source && <Badge variant="accent">{research.source}</Badge>}
          <p className="fhis-vws-prose">{research.excerpt}</p>
        </>
      ) : (
        <EmptyState icon="◎" title="Research pendiente" description={research.excerpt} />
      )}
    </Panel>
  );
}
