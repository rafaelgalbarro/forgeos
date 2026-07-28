"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { MissionControlV2View } from "./MissionControlV2View";
import type { MissionPageVM } from "@/src/presentation/view-models/types";

const SECTION_IDS = [
  "overview",
  "plan",
  "conversation",
  "decisions",
  "activity",
  "outputs",
  "costs",
  "history",
] as const;

export function MissionPageView({
  vm,
  section = "overview",
}: {
  vm: MissionPageVM;
  section?: string;
}) {
  const active = SECTION_IDS.includes(section as (typeof SECTION_IDS)[number])
    ? section
    : "overview";

  const body = useMemo(() => {
    switch (active) {
      case "plan":
        return (
          <ul style={{ paddingLeft: 18 }}>
            {vm.planStages.map((s) => (
              <li key={s.id}>
                {s.label} — {s.status}
              </li>
            ))}
          </ul>
        );
      case "conversation":
        return <p>{vm.overview.ceoOpening}</p>;
      case "decisions":
        return (
          <ul style={{ paddingLeft: 18 }}>
            {vm.overview.approvals.map((a) => (
              <li key={a.id}>
                {a.label} · {a.status}
              </li>
            ))}
            {vm.overview.nextDecision && <li>Next: {vm.overview.nextDecision}</li>}
          </ul>
        );
      case "activity":
        return (
          <ul style={{ paddingLeft: 18 }}>
            {vm.overview.activity.map((a) => (
              <li key={a.id}>{a.label}</li>
            ))}
          </ul>
        );
      case "outputs":
        return (
          <div>
            <ul style={{ paddingLeft: 18 }}>
              {vm.overview.outputs.map((o) => (
                <li key={o.id}>
                  {o.label} · {o.status}
                </li>
              ))}
            </ul>
            <Link href={`/studio/${vm.missionId}`} style={{ fontSize: 13 }}>
              Open Studio →
            </Link>
          </div>
        );
      case "costs":
        return (
          <p style={{ fontSize: 14 }}>
            Costos <ProvenanceBadge badge={{ label: "ESTIMATED", tone: "estimated" }} /> — sin providers de billing
            cargados en paint inicial.
          </p>
        );
      case "history":
        return <p style={{ fontSize: 14 }}>Historial ligero — eventos de Query Layer V2 / Activity hub.</p>;
      default:
        return <MissionControlV2View vm={vm.overview} />;
    }
  }, [active, vm]);

  return (
    <div style={{ maxWidth: 1100 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>MISSION</p>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.2rem, 3vw, 1.6rem)" }}>{vm.title}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>
            <Link href={`/mission-control/${vm.missionId}`}>Mission Control</Link>
            {" · "}
            <Link href={`/studio/${vm.missionId}`}>Studio</Link>
          </p>
        </div>
        <ProvenanceBadge badge={vm.provenance} />
      </header>

      <nav
        aria-label="Mission sections"
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 18,
          borderBottom: "1px solid var(--mc-border, var(--fhis-color-border))",
          paddingBottom: 10,
        }}
      >
        {vm.sections.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              textDecoration: "none",
              background: active === s.id ? "var(--fhis-color-accent)" : "transparent",
              color: active === s.id ? "var(--fhis-color-accent-text)" : "var(--mc-text-primary, inherit)",
            }}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div>{body}</div>
    </div>
  );
}
