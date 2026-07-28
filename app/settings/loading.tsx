import { LoadingState } from "@/components/ui/LoadingState";

export default function SettingsLoading() {
  return (
    <div style={{ padding: 28 }}>
      <LoadingState title="Cargando Settings…" />
    </div>
  );
}
