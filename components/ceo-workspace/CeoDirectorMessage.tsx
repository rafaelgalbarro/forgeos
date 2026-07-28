"use client";

import { CeoCard } from "@/components/ui/fhis/CeoCard";
import type { CeoDirectorNarrative } from "@/lib/ceo-workspace";

interface CeoDirectorMessageProps {
  narrative: CeoDirectorNarrative;
}

export function CeoDirectorMessage({ narrative }: CeoDirectorMessageProps) {
  return (
    <CeoCard title="Director General" subtitle="Oficina ejecutiva · ForgeOS">
      <article className="ceo-ws-director-message" aria-label="Mensaje del Director General">
        <p className="ceo-ws-director-prose">{narrative.fullMessage}</p>
      </article>
    </CeoCard>
  );
}
