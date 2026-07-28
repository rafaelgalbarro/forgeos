import { ProductionHealthCenter } from "@/components/production-readiness/ProductionHealthCenter";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Producción — ForgeOS Health Center",
  description: "Program 6500 — Centro de salud de producción 24/7",
};

export default function ProductionPage() {
  return (
    <OsModuleFrame
      title="Production Health Center"
      description="Observabilidad y preparación para producción — solo APIs públicas"
    >
      <ProductionHealthCenter showLabLink />
    </OsModuleFrame>
  );
}
