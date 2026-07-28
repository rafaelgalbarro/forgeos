"use client";

import Link from "next/link";
import { ProvenanceBadge } from "./ProvenanceBadge";
import type { StudioHubVM } from "@/src/presentation/view-models/types";

export function StudioHubView({ vm }: { vm: StudioHubVM }) {
  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>STUDIO V2</p>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.25rem, 3vw, 1.6rem)" }}>
            Output Studio · {vm.missionId}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, maxWidth: 560 }}>
            Secciones bajo demanda (dynamic imports). No duplica Mission Control — aquí se operan outputs.
          </p>
        </div>
        <ProvenanceBadge badge={vm.provenance} />
      </header>
      <nav
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {vm.sections.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            style={{
              padding: "14px 12px",
              borderRadius: 10,
              border: "1px solid var(--fhis-color-border, #d4d0c8)",
              textDecoration: "none",
              color: "inherit",
              fontSize: 14,
              fontWeight: 600,
              opacity: s.available ? 1 : 0.5,
            }}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <p style={{ marginTop: 20, fontSize: 13 }}>
        <Link href={`/missions/${vm.missionId}`}>← Mission page</Link>
        {" · "}
        <Link href={`/mission-control/${vm.missionId}`}>Mission Control</Link>
      </p>
    </div>
  );
}
