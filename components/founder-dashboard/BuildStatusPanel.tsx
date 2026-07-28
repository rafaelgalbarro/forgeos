import Link from "next/link";
import type { FounderBuildSection } from "@/lib/founder-dashboard/types";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface BuildStatusPanelProps {
  build: FounderBuildSection;
}

export function BuildStatusPanel({ build }: BuildStatusPanelProps) {
  const items = build?.items ?? [];

  return (
    <Panel className="fhis-founder-panel" id="founder-build">
      <SectionHeader title="Build" subtitle={build?.headline ?? "Estado de construcción"} />
      {items.length === 0 ? (
        <p className="fhis-founder-prose">Crea una empresa para ver el estado de construcción.</p>
      ) : (
        <ul className="fhis-founder-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="fhis-founder-build-item">
                <div className="fhis-founder-build-head">
                  <strong>{item.ventureName}</strong>
                  <span className="fhis-founder-build-phase">{item.phaseLabel}</span>
                </div>
                <div className="fhis-founder-progress" aria-hidden>
                  <div
                    className="fhis-founder-progress-bar"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
                <p className="fhis-founder-build-status">{item.statusMessage}</p>
                <span className="fhis-founder-build-milestone">
                  Próximo hito: {item.nextMilestone}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
