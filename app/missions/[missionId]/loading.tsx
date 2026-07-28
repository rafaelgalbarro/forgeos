import { LoadingState } from "@/components/ui/LoadingState";

export default function MissionPageLoading() {
  return (
    <div style={{ padding: 28 }}>
      <LoadingState title="Cargando misión…" description="Overview ligero — Query Layer V2." />
    </div>
  );
}
