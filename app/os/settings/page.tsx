import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Card } from "@/components/ui/fhis/Card";

export const metadata = { title: "Settings — ForgeOS" };

export default function OsSettingsPage() {
  return (
    <OsModuleFrame title="Settings" description="Preferencias del sistema operativo">
      <div className="fhis-os-settings-grid">
        <Card>
          <h3>Cuenta</h3>
          <p>Perfil del fundador y preferencias de notificación.</p>
        </Card>
        <Card>
          <h3>Integraciones</h3>
          <p>Conexiones con herramientas externas.</p>
        </Card>
        <Card>
          <h3>Design System</h3>
          <p>Tokens y componentes FHIS.</p>
          <Link href="/design-system">Abrir FHIS →</Link>
        </Card>
      </div>
    </OsModuleFrame>
  );
}
