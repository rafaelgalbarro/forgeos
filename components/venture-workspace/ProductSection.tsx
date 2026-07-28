import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface ProductSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function ProductSection({ data }: ProductSectionProps) {
  const { product } = data;
  return (
    <Panel id="product" className="fhis-vws-section">
      <SectionHeader title="Product" subtitle="PRD y definición de MVP" />
      {product.hasContent ? (
        <>
          {product.source && <Badge variant="accent">{product.source}</Badge>}
          <p className="fhis-vws-prose">{product.excerpt}</p>
        </>
      ) : (
        <EmptyState icon="◫" title="Product pendiente" description={product.excerpt} />
      )}
    </Panel>
  );
}
