import { LoadingState } from "@/components/ui/LoadingState";

export default function MissionControlLoading() {
  return (
    <div style={{ padding: 28 }}>
      <LoadingState
        title="Cargando Mission Control…"
        description="Snapshot ligero (Query Layer V2) — sin engines en paint inicial."
      />
    </div>
  );
}
