import { LoadingState } from "@/components/ui/LoadingState";

export default function RootLoading() {
  return (
    <div style={{ padding: 40 }}>
      <LoadingState title="Cargando ForgeOS…" description="Experience Layer V2 — paint ligero." />
    </div>
  );
}
