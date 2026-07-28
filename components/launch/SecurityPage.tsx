import Link from "next/link";
import { LegalPlaceholder } from "./LegalPlaceholder";
import { LaunchNav } from "./LaunchNav";

export function SecurityPage() {
  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <LegalPlaceholder title="Seguridad">
        <section>
          <h2>1. Modo dry-run</h2>
          <p>
            RC12 opera en modo dry-run para operaciones críticas: deploy, conexiones reales y
            pagos están deshabilitados o simulados.
          </p>
        </section>
        <section>
          <h2>2. Almacenamiento local</h2>
          <p>
            No hay servidor de autenticación en esta fase. El acceso beta se valida contra
            registros en localStorage del cliente.
          </p>
        </section>
        <section>
          <h2>3. AI Runtime</h2>
          <p>
            Las llamadas a modelos de IA pasan por el router interno de ForgeOS. Las API keys
            no se exponen en el cliente en producción.
          </p>
        </section>
        <section>
          <h2>4. Reportar vulnerabilidades</h2>
          <p>
            Usa el <Link href="/support">centro de soporte</Link> o el widget de feedback para
            reportar problemas de seguridad durante la beta.
          </p>
        </section>
        <p>
          <Link href="/docs">← Volver a Docs</Link>
        </p>
      </LegalPlaceholder>
    </div>
  );
}
