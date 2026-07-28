"use client";

import dynamic from "next/dynamic";
import { MissionControlV2View } from "./MissionControlV2View";
import { MissionControlNav } from "./MissionControlNav";
import type { MissionControlVM } from "@/src/presentation/view-models/types";
import type { MissionSnapshot } from "@/lib/mission-control/types";

const MissionControlClient = dynamic(
  () =>
    import("@/components/mission-control/MissionControlClient").then((m) => m.MissionControlClient),
  {
    ssr: false,
    loading: () => (
      <div className="fhis-empty-state" style={{ padding: 24 }} role="status">
        <div className="fhis-empty-state-title">Cargando conversación…</div>
        <div className="fhis-empty-state-desc">
          Controles y AI CEO bajo demanda — sin engines en paint inicial.
        </div>
      </div>
    ),
  }
);

/**
 * Single Mission Control composition:
 * Nav (Mission / Studio / Review / Company) + Header + Workspace (conversation + read-model panels).
 * Does not stack a second MC page.
 */
export function MissionControlExperience({
  vm,
  snapshot,
  missionId,
}: {
  vm: MissionControlVM;
  snapshot: MissionSnapshot;
  missionId?: string;
}) {
  const conversation =
    vm.availability === "empty" ||
    vm.availability === "error" ||
    vm.availability === "unavailable" ||
    vm.availability === "permission_denied" ? null : (
      <MissionControlClient initialSnapshot={snapshot} missionId={missionId} embedded />
    );

  return (
    <div className="mc-root" data-testid="mission-control-experience">
      <MissionControlNav missionId={vm.missionId ?? missionId} />
      <MissionControlV2View vm={vm} conversation={conversation} />
    </div>
  );
}
