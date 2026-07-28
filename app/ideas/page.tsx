import { PageHeader } from "@/components/layout/PageHeader";

const ideas = [
  ["ADMIN-001", "Administración", "Ayudas públicas", "Buscador personalizado de ayudas según perfil y ubicación", "92%", "No referente claro"],
  ["SAFE-001", "Seguridad", "Phishing y estafas", "Detector de SMS, llamadas, emails y webs fraudulentas", "88%", "Truecaller; Norton Genie"],
  ["FOOD-001", "Alimentación", "Desperdicio doméstico", "Control de caducidades por foto y recetas IA", "84%", "NoWaste; Kitche"],
  ["HEALTH-001", "Salud", "Cuidado de mayores", "Agenda de medicación, citas y alertas familiares", "86%", "Medisafe; Carely"],
  ["FIN-001", "Finanzas", "Suscripciones olvidadas", "Detector y cancelador de pagos recurrentes", "82%", "Rocket Money; Bobby"]
];

export default function IdeasPage() {
  return (
    <section>
      <PageHeader
        badge="Catálogo de oportunidades"
        title="Ideas organizadas por sector"
        description="Vista inicial. El siguiente paso será importar el catálogo completo de 1.000 ideas."
      />
      <table>
        <thead>
          <tr><th>ID</th><th>Sector</th><th>Nicho</th><th>Solución</th><th>Prob.</th><th>Competidores</th></tr>
        </thead>
        <tbody>
          {ideas.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => <td key={cell}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
