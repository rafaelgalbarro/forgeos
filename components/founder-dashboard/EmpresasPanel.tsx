import Link from "next/link";
import type { FounderEmpresasSection } from "@/lib/founder-dashboard/types";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { cn } from "@/lib/design-system/cn";

interface EmpresasPanelProps {
  empresas: FounderEmpresasSection;
}

export function EmpresasPanel({ empresas }: EmpresasPanelProps) {
  return (
    <section id="founder-empresas">
      <div className="fhis-founder-section-head">
        <SectionHeader title="Empresas" subtitle="Tu portfolio de ventures" />
        <Badge variant="accent">
          {empresas.ventures.length} empresa{empresas.ventures.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {empresas.ventures.length === 0 ? (
        <EmptyState icon="◫" title="Sin empresas" description={empresas.emptyMessage}>
          <Link href="/" className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-md")}>
            + Crear Empresa
          </Link>
        </EmptyState>
      ) : (
        <div className="fhis-founder-empresas-grid">
          {empresas.ventures.map((venture) => (
            <Panel key={venture.id} className="fhis-founder-empresa-card">
              <Link href={venture.href} className="fhis-founder-empresa-link">
                <div className="fhis-founder-empresa-head">
                  <div>
                    <h3>{venture.name}</h3>
                    <span className="fhis-founder-empresa-type">{venture.ventureType}</span>
                  </div>
                  <Badge variant="blue">{venture.statusLabel}</Badge>
                </div>
                <p className="fhis-founder-empresa-desc">{venture.shortDescription}</p>
                <div className="fhis-founder-empresa-meta">
                  <span>{venture.lifeStageLabel}</span>
                  <span>Score {venture.startupScore}</span>
                  <span>{venture.lastUpdatedRelative}</span>
                </div>
                <p className="fhis-founder-empresa-next">
                  Siguiente: <strong>{venture.nextAction}</strong>
                </p>
              </Link>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}
