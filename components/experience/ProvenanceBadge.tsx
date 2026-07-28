/** PROGRAM 6060 — Provenance badge: DEMO | ESTIMATED | CONNECTED | LIVE
 * Dark-coherent tones using --mc / --fhis semantic tokens (no light chips on dark page).
 */

import type { CSSProperties } from "react";
import type { ProvenanceBadgeVM } from "@/src/presentation/view-models/types";

const STYLES: Record<ProvenanceBadgeVM["tone"], CSSProperties> = {
  demo: {
    background: "var(--mc-surface-elevated, var(--fhis-color-surface-muted))",
    color: "var(--mc-text-secondary, var(--fhis-color-text-secondary))",
    border: "1px solid var(--mc-border, var(--fhis-color-border))",
  },
  estimated: {
    background: "var(--fhis-color-warning-bg)",
    color: "var(--mc-warning, var(--fhis-color-warning))",
    border: "1px solid rgba(251, 191, 36, 0.35)",
  },
  connected: {
    background: "var(--fhis-color-info-bg)",
    color: "var(--mc-info, var(--fhis-color-info))",
    border: "1px solid rgba(129, 140, 248, 0.35)",
  },
  live: {
    background: "var(--fhis-color-success-bg)",
    color: "var(--mc-success, var(--fhis-color-success))",
    border: "1px solid rgba(74, 222, 128, 0.35)",
  },
};

export function ProvenanceBadge({ badge }: { badge: ProvenanceBadgeVM }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        padding: "2px 8px",
        borderRadius: 4,
        ...STYLES[badge.tone],
      }}
      title={`Origen de datos: ${badge.label} — nunca se presenta DEMO como LIVE`}
    >
      {badge.label}
    </span>
  );
}
