import { LoadingState } from "@/components/ui/LoadingState";

export default function ActivityLoading() {
  return (
    <div style={{ padding: 28 }}>
      <LoadingState title="Cargando Activity…" />
    </div>
  );
}
