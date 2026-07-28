import { PageHeader } from "@/components/layout/PageHeader";

const agents = [
  ["CEO Agent", "Evalúa mercado, competencia, riesgo y probabilidad de éxito."],
  ["Product Agent", "Convierte la idea en PRD, MVP, roadmap y backlog."],
  ["UX Agent", "Define pantallas, navegación, flujos y experiencia de usuario."],
  ["CTO Agent", "Elige stack, arquitectura, integraciones y criterios técnicos."],
  ["Database Agent", "Diseña PostgreSQL, tablas, relaciones, permisos y políticas."],
  ["Backend Agent", "Define APIs, reglas de negocio, jobs y seguridad."],
  ["Frontend Agent", "Diseña componentes, páginas, estados y responsive."],
  ["Mobile Agent", "Adapta la app a Expo, iOS y Android."],
  ["Marketing Agent", "Crea nombre, posicionamiento, pricing, landing, SEO y ASO."],
  ["Legal Agent", "Genera privacidad, términos, cookies y checklist RGPD."]
];

export default function AgentsPage() {
  return (
    <section>
      <PageHeader
        badge="Sistema multiagente"
        title="Agentes IA"
        description="Cada agente produce una parte del negocio y del producto."
      />
      <div className="grid">
        {agents.map(([name, role]) => (
          <div className="card" key={name}>
            <h3>{name}</h3>
            <p>{role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
