import { LoadingState } from "@/components/ui/LoadingState";

export default function CommandCenterLoading() {
  return (
    <LoadingState
      title="Cargando Command Center…"
      description="Preparando snapshot del centro de mando"
    />
  );
}
