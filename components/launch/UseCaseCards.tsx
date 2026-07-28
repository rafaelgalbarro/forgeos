import { Container, Grid, Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";

const USE_CASES = [
  {
    id: "founder",
    icon: "🚀",
    title: "Fundador solo",
    description: "Valida ideas, genera brand y lanza tu primera venture en horas, no meses.",
    tag: "Founder",
  },
  {
    id: "studio",
    icon: "🏭",
    title: "Venture Studio",
    description: "Gestiona un portfolio de ventures con IA autónoma y métricas ejecutivas.",
    tag: "Studio",
  },
  {
    id: "agency",
    icon: "⚡",
    title: "Agencia / Consultora",
    description: "Entrega ventures completas a clientes con ForgeOS como motor de producción.",
    tag: "Agency",
  },
  {
    id: "corporate",
    icon: "🏢",
    title: "Innovación corporativa",
    description: "Incuba ventures internas con governance, KPIs y due diligence integrados.",
    tag: "Enterprise",
  },
];

export function UseCaseCards() {
  return (
    <Container className="fhis-launch-use-cases">
      <Grid cols={2} gap="lg">
        {USE_CASES.map((uc) => (
          <Panel key={uc.id} className="fhis-launch-use-case-card">
            <div className="fhis-launch-use-case-icon">{uc.icon}</div>
            <Badge variant="default">{uc.tag}</Badge>
            <h3 className="fhis-launch-use-case-title">{uc.title}</h3>
            <p className="fhis-launch-use-case-desc">{uc.description}</p>
          </Panel>
        ))}
      </Grid>
    </Container>
  );
}
