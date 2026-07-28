import dynamic from "next/dynamic";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { LoadingState } from "@/components/ui/LoadingState";

const SelfEvolutionDashboard = dynamic(
  () =>
    import("@/components/self-evolution/SelfEvolutionDashboard").then((m) => ({
      default: m.SelfEvolutionDashboard,
    })),
  {
    loading: () => <LoadingState title="Cargando Self Evolution…" description="Motor dry-run — lazy load" />,
  }
);

export const metadata = {
  title: "Self Evolution — ForgeOS",
  description: "Program 2035 — Motor de auto-evolución con governance y aprobación humana",
};

export default function SelfEvolutionPage() {
  return (
    <OsModuleFrame
      title="Self Evolution Engine"
      description="Observación, propuestas y planes — nunca auto-modifica código"
    >
      <SelfEvolutionDashboard showLabLink />
    </OsModuleFrame>
  );
}
