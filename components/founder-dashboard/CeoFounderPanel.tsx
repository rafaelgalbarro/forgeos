import Link from "next/link";
import type { FounderCeoSection } from "@/lib/founder-dashboard/types";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { cn } from "@/lib/design-system/cn";

interface CeoFounderPanelProps {
  ceo: FounderCeoSection;
}

export function CeoFounderPanel({ ceo }: CeoFounderPanelProps) {
  return (
    <Panel className="fhis-founder-ceo" id="founder-ceo">
      <SectionHeader title="CEO" subtitle="Resumen ejecutivo del día" />
      <p className="fhis-founder-ceo-greeting">{ceo.greeting}</p>
      <p className="fhis-founder-prose">{ceo.summary}</p>

      <div className="fhis-founder-ceo-insights">
        <div className="fhis-founder-ceo-insight">
          <Badge variant="amber">⚠</Badge>
          <div>
            <span className="fhis-founder-insight-label">Riesgo</span>
            <p>{ceo.criticalRisk}</p>
          </div>
        </div>
        <div className="fhis-founder-ceo-insight">
          <Badge variant="blue">→</Badge>
          <div>
            <span className="fhis-founder-insight-label">Recomendación</span>
            <p>{ceo.recommendation}</p>
          </div>
        </div>
        <div className="fhis-founder-ceo-insight">
          <Badge variant="accent">◆</Badge>
          <div>
            <span className="fhis-founder-insight-label">Oportunidad</span>
            <p>{ceo.opportunity}</p>
          </div>
        </div>
      </div>

      <p className="fhis-founder-prose fhis-founder-impact">{ceo.expectedImpact}</p>

      <Link href={ceo.ctaHref} className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
        {ceo.ctaLabel}
      </Link>
    </Panel>
  );
}
