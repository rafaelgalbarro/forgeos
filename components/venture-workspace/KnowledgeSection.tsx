import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface KnowledgeSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function KnowledgeSection({ data }: KnowledgeSectionProps) {
  const { knowledge } = data;
  return (
    <Panel id="knowledge" className="fhis-vws-section">
      <SectionHeader title="Knowledge" subtitle="Referencias y contexto de dominio" />
      {knowledge.hasContent ? (
        <>
          {knowledge.source && <Badge variant="blue">{knowledge.source}</Badge>}
          <p className="fhis-vws-prose">{knowledge.excerpt}</p>
        </>
      ) : (
        <EmptyState icon="◇" title="Sin knowledge vinculado" description={knowledge.excerpt} />
      )}
    </Panel>
  );
}
