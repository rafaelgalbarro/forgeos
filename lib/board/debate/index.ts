import type { VentureProject } from "@/lib/domain/venture";
import type { BoardArgument, BoardDebateResult, BoardMemberRole } from "../types";
import { getActiveMembers } from "../member";

function arg(member: BoardMemberRole, point: string, weight: number): BoardArgument {
  return { member, point, weight };
}

export function runDebate(
  question: string,
  ventures: VentureProject[]
): BoardDebateResult {
  const hasVentures = ventures.length > 0;
  const focus = ventures[0];
  const members = getActiveMembers();

  const pros: BoardArgument[] = [];
  const contras: BoardArgument[] = [];
  const riesgos: BoardArgument[] = [];
  const oportunidades: BoardArgument[] = [];

  if (!hasVentures) {
  pros.push(arg("CEO", "Capturar idea ahora desbloquea todo el pipeline ForgeOS.", 90));
    contras.push(arg("CFO", "Sin validación previa, el coste de oportunidad es incierto.", 60));
    riesgos.push(arg("Data", "Sin datos de mercado, cualquier decisión es especulativa.", 85));
    oportunidades.push(arg("Growth", "Primer venture define el ritmo del studio.", 75));
    return { pros, contras, riesgos, oportunidades };
  }

  for (const role of members) {
    if (role === "CEO") {
      pros.push(arg(role, `Priorizar ${focus.name} maximiza impacto inmediato.`, 85));
    }
    if (role === "CTO" && focus.productPRD) {
      pros.push(arg(role, "PRD listo — arquitectura puede definirse con claridad.", 80));
    }
    if (role === "CPO" && !focus.researchReport) {
      contras.push(arg(role, "Sin Research, el PRD carecerá de fundamento.", 82));
    }
    if (role === "CFO" && focus.status === "building") {
      riesgos.push(arg(role, "Build activo consume runway — validar unit economics.", 78));
    }
    if (role === "Data" && !focus.ventureSimulatorResult) {
      riesgos.push(arg(role, "Simulator pendiente — falta señal cuantitativa.", 70));
    }
    if (role === "Growth" && focus.researchReport) {
      oportunidades.push(arg(role, "Research completo — momento de definir GTM.", 80));
    }
    if (role === "Legal") {
      riesgos.push(arg(role, "Revisar compliance antes de lanzar a usuarios.", 55));
    }
    if (role === "CMO") {
      oportunidades.push(arg(role, "Posicionamiento diferenciado acelera adquisición.", 72));
    }
    if (role === "COO") {
      pros.push(arg(role, "Pipeline operativo — siguiente paso está claro.", 68));
    }
  }

  if (pros.length === 0) {
    pros.push(arg("CEO", `Avanzar con ${focus.name} mantiene momentum del portfolio.`, 75));
  }
  if (contras.length === 0) {
    contras.push(arg("CFO", "Evaluar coste de oportunidad vs otras ventures.", 50));
  }
  if (riesgos.length === 0) {
    riesgos.push(arg("Data", "Monitorear señales de mercado continuamente.", 45));
  }
  if (oportunidades.length === 0) {
    oportunidades.push(arg("Growth", "Cada fase completada abre nuevas palancas.", 60));
  }

  void question;
  return { pros, contras, riesgos, oportunidades };
}
