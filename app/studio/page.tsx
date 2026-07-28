import Link from "next/link";
import { loadStudioHubVM } from "@/src/presentation";
import { StudioHubView } from "@/components/experience/StudioHubView";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Studio — ForgeOS",
  description: "PROGRAM 6060 — Studio V2 hub",
};

export default function StudioIndexPage() {
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", maxWidth: 720 }}>
      <EmptyState
        title="Abrir Studio desde una misión"
        description="Studio V2 opera outputs de una misión. Elige una misión o crea un venture."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, justifyContent: "center" }}>
          <Link href="/mission-control" className="fhis-btn fhis-btn-primary">
            Mission Control
          </Link>
          <Link href="/studio/demo-mission" className="fhis-btn">
            Demo Studio
          </Link>
        </div>
      </EmptyState>
      {/* keep hub VM import warm for typecheck / tree — demo path below */}
      <StudioDemoHint />
    </div>
  );
}

function StudioDemoHint() {
  const vm = loadStudioHubVM("demo-mission");
  return (
    <p style={{ marginTop: 24, fontSize: 12, opacity: 0.65, textAlign: "center" }}>
      {vm.sections.length} secciones Studio listas · provenance {vm.provenance.label}
    </p>
  );
}
