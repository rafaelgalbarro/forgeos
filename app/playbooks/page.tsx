import { PlaybookLibraryPanel } from "@/components/intelligence-network";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Playbooks — ForgeOS Intelligence Network",
  description: "Biblioteca de playbooks agregados de la red colectiva",
};

export default function PlaybooksPage() {
  return (
    <OsModuleFrame
      title="Playbooks de Red"
      description="Catálogo de playbooks validados por la red — datos anonimizados"
    >
      <PlaybookLibraryPanel />
    </OsModuleFrame>
  );
}
