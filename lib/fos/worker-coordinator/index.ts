import type { VentureProject } from "@/lib/domain/venture";

export interface WorkerAssignment {
  workerId: string;
  workerLabel: string;
  ventureId: string | null;
  status: "idle" | "active" | "queued";
  task: string;
}

const WORKER_DEFS = [
  { id: "discovery", label: "Discovery Agent" },
  { id: "research", label: "Research Agent" },
  { id: "product", label: "Product Agent" },
  { id: "simulator", label: "Simulator Agent" },
  { id: "build-plan", label: "Build Plan Agent" },
] as const;

export function coordinateWorkers(ventures: VentureProject[]): WorkerAssignment[] {
  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const focus = sorted[0] ?? null;

  return WORKER_DEFS.map((w) => {
    let status: WorkerAssignment["status"] = "idle";
    let task = "Esperando venture activo";

    if (focus) {
      if (w.id === "discovery") {
        const pending = focus.discoveryContext?.remainingQuestions?.length ?? 0;
        status = pending > 0 ? "active" : "idle";
        task = pending > 0 ? `Responder ${pending} preguntas` : "Discovery completo";
      } else if (w.id === "research") {
        status = !focus.researchReport && !focus.discoveryContext?.remainingQuestions?.length ? "queued" : "idle";
        task = focus.researchReport ? "Research listo" : "Pendiente de Discovery";
      } else if (w.id === "product") {
        status = focus.researchReport && !focus.productPRD ? "queued" : "idle";
        task = focus.productPRD ? "PRD generado" : "Esperando Research";
      } else if (w.id === "simulator") {
        status = focus.researchReport ? "active" : "idle";
        task = "Evaluando viabilidad";
      } else if (w.id === "build-plan") {
        status = focus.productPRD ? "queued" : "idle";
        task = focus.productPRD ? "Listo para Build Plan" : "Esperando PRD";
      }
    }

    return {
      workerId: w.id,
      workerLabel: w.label,
      ventureId: focus?.id ?? null,
      status,
      task,
    };
  });
}
