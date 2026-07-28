# Roadmap interno

El `roadmap-engine` genera items de roadmap vinculados a propuestas.

## Estructura

```ts
interface RoadmapItem {
  id: string;
  title: string;
  quarter: string;       // Q3 2026, Q4 2026, etc.
  area: AffectedArea;
  priority: ProposalPriority;
  status: "planned" | "in-progress" | "done";
  linkedProposalIds: string[];
}
```

## Uso

Las propuestas de mayor prioridad se asignan a quarters futuros. El primer item queda `in-progress` como demo.

No modifica código — solo planificación interna visible en el dashboard.
