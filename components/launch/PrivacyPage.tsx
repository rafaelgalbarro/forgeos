import Link from "next/link";
import { LegalPlaceholder } from "./LegalPlaceholder";
import { LaunchNav } from "./LaunchNav";

export function PrivacyPage() {
  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <LegalPlaceholder title="Política de Privacidad">
        <section>
          <h2>1. Alcance</h2>
          <p>
            Esta política aplica a ForgeOS en fase de beta privada (RC12). No recopilamos datos
            de pago ni enviamos emails reales en esta versión.
          </p>
        </section>
        <section>
          <h2>2. Datos que almacenamos</h2>
          <p>
            En RC12, el registro beta y las preferencias de onboarding se guardan en{" "}
            <code>localStorage</code> de tu navegador. Las ventures demo se almacenan localmente.
          </p>
        </section>
        <section>
          <h2>3. Analytics</h2>
          <p>
            Usamos hooks de analytics placeholder que solo registran eventos en la consola del
            navegador. No hay SDK externo ni tracking de terceros.
          </p>
        </section>
        <section>
          <h2>4. Tus derechos</h2>
          <p>
            Puedes borrar todos tus datos locales limpiando el almacenamiento del navegador para
            este dominio.
          </p>
        </section>
        <p>
          <Link href="/docs">← Volver a Docs</Link>
        </p>
      </LegalPlaceholder>
    </div>
  );
}
