import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Card } from "@/components/ui/fhis/Card";

export const metadata = { title: "Marketplace — ForgeOS" };

export default function OsMarketplacePage() {
  return (
    <OsModuleFrame title="Marketplace" description="Plantillas y activos reutilizables">
      <Card>
        <h3>Plantillas</h3>
        <p>Explora plantillas de ventures y módulos listos para usar.</p>
        <Link href="/templates">Abrir Marketplace →</Link>
      </Card>
    </OsModuleFrame>
  );
}
