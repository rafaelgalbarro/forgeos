import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface ArchitectureSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function ArchitectureSection({ data }: ArchitectureSectionProps) {
  const { architecture } = data;
  return (
    <Panel id="architecture" className="fhis-vws-section">
      <SectionHeader title="Architecture" subtitle="Diseño técnico de alto nivel" />
      {architecture.hasContent ? (
        <pre className="fhis-vws-code">
          <code>{architecture.excerpt}</code>
        </pre>
      ) : (
        <EmptyState icon="⬡" title="Arquitectura pendiente" description={architecture.excerpt} />
      )}
    </Panel>
  );
}
