"use client";

import dynamic from "next/dynamic";
import type { MissionSnapshot } from "@/lib/mission-control/types";

const MissionControlShell = dynamic(
  () => import("./MissionControlShell").then((m) => m.MissionControlShell),
  {
    ssr: false,
    loading: () => (
      <div className="fhis-page" style={{ padding: 32, textAlign: "center" }}>
        Cargando Mission Control…
      </div>
    ),
  }
);

interface Props {
  initialSnapshot: MissionSnapshot;
  missionId?: string;
  /** When true, shell is workspace-only (no second MC page chrome). */
  embedded?: boolean;
}

export function MissionControlClient({ initialSnapshot, missionId, embedded }: Props) {
  return (
    <MissionControlShell initialSnapshot={initialSnapshot} missionId={missionId} embedded={embedded} />
  );
}
