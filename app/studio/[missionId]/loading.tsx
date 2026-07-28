import { LoadingState } from "@/components/ui/LoadingState";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export default function StudioLoading() {
  return (
    <OsModuleFrame title="Creation Output Studio" description="PROGRAM 5350">
      <LoadingState title="Cargando Output Studio…" description="Metadatos ligeros primero — previews bajo demanda." />
    </OsModuleFrame>
  );
}
