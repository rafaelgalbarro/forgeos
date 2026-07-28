import Link from "next/link";

const templates = [
  ["SaaS básico", "Login, usuarios, roles, dashboard, pagos, ajustes y admin."],
  ["Marketplace", "Perfiles, oferta/demanda, búsqueda, pagos, chat y valoraciones."],
  ["Reservas", "Disponibilidad, calendario, reservas, pagos y recordatorios."],
  ["Dashboard", "KPIs, filtros, gráficos, exportación y roles."],
  ["Mobile Expo", "Base iOS/Android con navegación, auth y API compartida."],
];

export default function TemplatesPage() {
  return (
    <section>
      <header className="page-header">
        <span className="badge">Plantillas</span>
        <h1>Plantillas reutilizables</h1>
        <p>Bases de proyecto listas para acelerar la generación con IA.</p>
      </header>
      <div className="grid">
        {templates.map(([name, desc]) => (
          <div className="card" key={name}>
            <h3>{name}</h3>
            <p>{desc}</p>
            <div className="hero-actions" style={{ marginTop: 16 }}>
              <Link className="button secondary" href="/new-app">
                Usar plantilla
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
