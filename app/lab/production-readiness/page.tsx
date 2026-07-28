import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { ProductionHealthCenter } from "@/components/production-readiness/ProductionHealthCenter";
import { Panel, SectionHeader } from "@/components/ui/fhis";
import { PRODUCTION_READINESS_VERSION } from "@/lib/production-readiness";

export const metadata = {
  title: "Production Readiness Lab — ForgeOS",
  description: "Program 6500 — Harness de ingeniería",
};

export default function ProductionReadinessLabPage() {
  return (
    <OsModuleFrame
      title="Production Readiness Lab"
      description={`${PRODUCTION_READINESS_VERSION} — harness de validación`}
    >
      <Panel className="fhis-prod-lab-intro">
        <SectionHeader title="Lab harness" subtitle="Mismos motores que /production" />
        <p className="fhis-prod-text">
          Capa de observabilidad sin modificar Runtime, Executive Mesh, AI Runtime ni Skills.
        </p>
        <Link href="/production" className="fhis-prod-link">Abrir dashboard principal →</Link>
      </Panel>
      <ProductionHealthCenter />
    </OsModuleFrame>
  );
}
