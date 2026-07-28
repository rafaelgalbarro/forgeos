import type { VentureProject } from "@/lib/domain/venture";
import { sectionHasContent } from "@/lib/portfolio/venture-status";
import type { DepartmentId, DepartmentState, DepartmentStatus, HeadquartersSnapshot } from "./types";

const LABELS: Record<DepartmentId, string> = {
  ceo: "CEO",
  research: "Research",
  product: "Product",
  ux: "UX",
  cto: "CTO",
  marketing: "Marketing",
  finance: "Finance",
  legal: "Legal",
  operations: "Operations",
};

const STATUS_LABELS: Record<DepartmentStatus, string> = {
  working: "Trabajando",
  waiting: "Esperando decisión",
  blocked: "Bloqueado",
  pending: "Pendiente",
};

function aggregateStatus(
  ventures: VentureProject[],
  checker: (v: VentureProject) => DepartmentStatus,
  workingDetail: string,
  waitingDetail: string,
  pendingDetail: string
): { status: DepartmentStatus; detail: string } {
  if (ventures.length === 0) {
    return { status: "pending", detail: pendingDetail };
  }

  const statuses = ventures.map(checker);
  if (statuses.some((s) => s === "blocked")) {
    return { status: "blocked", detail: "Hay ventures que requieren atención." };
  }
  if (statuses.some((s) => s === "waiting")) {
    return { status: "waiting", detail: waitingDetail };
  }
  if (statuses.some((s) => s === "working")) {
    return { status: "working", detail: workingDetail };
  }
  return { status: "pending", detail: pendingDetail };
}

function buildDepartment(
  id: DepartmentId,
  ventures: VentureProject[],
  checker: (v: VentureProject) => DepartmentStatus,
  workingDetail: string,
  waitingDetail: string,
  pendingDetail: string
): DepartmentState {
  const { status, detail } = aggregateStatus(
    ventures,
    checker,
    workingDetail,
    waitingDetail,
    pendingDetail
  );
  return {
    id,
    label: LABELS[id],
    status,
    statusLabel: STATUS_LABELS[status],
    detail,
  };
}

export function buildHeadquartersSnapshot(ventures: VentureProject[]): HeadquartersSnapshot {
  const departments: DepartmentState[] = [
    buildDepartment(
      "ceo",
      ventures,
      () => (ventures.length > 0 ? "working" : "pending"),
      "Revisando portfolio y prioridades.",
      "Esperando tu decisión estratégica.",
      "Sin ventures activos."
    ),
    buildDepartment(
      "research",
      ventures,
      (v) => {
        const remaining = v.discoveryContext?.remainingQuestions?.length ?? 0;
        if (remaining > 0) return "waiting";
        if (!v.researchReport) return "working";
        return "pending";
      },
      "Analizando mercados.",
      "Discovery necesita respuestas.",
      "Sin análisis activos."
    ),
    buildDepartment(
      "product",
      ventures,
      (v) => {
        if (!v.researchReport) return "pending";
        if (!v.productPRD) return "working";
        return "pending";
      },
      "Definiendo MVP.",
      "Esperando cierre de Research.",
      "Pendiente."
    ),
    buildDepartment(
      "ux",
      ventures,
      (v) => {
        if (!v.productPRD) return "pending";
        if (!sectionHasContent(v, "ux") && !sectionHasContent(v, "wireframes")) return "working";
        return "pending";
      },
      "Diseñando experiencia.",
      "Esperando PRD.",
      "Pendiente."
    ),
    buildDepartment(
      "cto",
      ventures,
      (v) => {
        if (v.status === "building" && !sectionHasContent(v, "arquitectura")) return "working";
        if (sectionHasContent(v, "arquitectura")) return "pending";
        return "pending";
      },
      "Revisando arquitectura.",
      "Esperando fase Build.",
      "Pendiente."
    ),
    buildDepartment(
      "marketing",
      ventures,
      (v) => {
        if (v.researchReport && !sectionHasContent(v, "landing")) return "working";
        return "pending";
      },
      "Analizando competencia.",
      "Pendiente.",
      "Pendiente."
    ),
    buildDepartment(
      "finance",
      ventures,
      () => (ventures.some((v) => v.ventureSimulatorResult) ? "working" : "pending"),
      "Modelando unit economics.",
      "Pendiente.",
      "Pendiente."
    ),
    buildDepartment(
      "legal",
      ventures,
      () => (ventures.some((v) => sectionHasContent(v, "legal")) ? "working" : "pending"),
      "Revisando compliance.",
      "Pendiente.",
      "Pendiente."
    ),
    buildDepartment(
      "operations",
      ventures,
      (v) => (v.status === "ready" ? "working" : "pending"),
      "Preparando lanzamiento.",
      "Pendiente.",
      "Pendiente."
    ),
  ];

  return {
    departments,
    activeCount: departments.filter((d) => d.status === "working").length,
    waitingCount: departments.filter((d) => d.status === "waiting").length,
  };
}
