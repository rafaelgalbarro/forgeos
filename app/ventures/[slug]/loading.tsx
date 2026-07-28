import { LoadingState } from "@/components/ui/LoadingState";

export default function VentureSlugLoading() {
  return (
    <LoadingState title="Cargando Venture…" description="Preparando snapshot del pipeline E2E" />
  );
}
