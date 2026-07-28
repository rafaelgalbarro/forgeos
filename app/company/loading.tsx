import { LoadingState } from "@/components/ui/LoadingState";

export default function CompanyLoading() {
  return (
    <div style={{ padding: 28 }}>
      <LoadingState title="Cargando Company Command Center…" description="Agregando estado real de creación de empresa." />
    </div>
  );
}
