import type { BoardMemberProfile, BoardMemberRole } from "../types";

const MEMBER_DEFS: BoardMemberProfile[] = [
  {
    role: "CEO",
    name: "AI CEO",
    objectives: ["Maximizar impacto del portfolio", "Priorizar decisiones estratégicas"],
    priorities: ["Velocidad de validación", "Foco en una startup"],
    criteria: ["Impacto esperado", "Riesgo vs retorno"],
    specialization: "Estrategia y priorización",
    memory: ["Última decisión: cerrar Discovery antes de Build"],
  },
  {
    role: "CTO",
    name: "AI CTO",
    objectives: ["Arquitectura sólida", "Deuda técnica mínima"],
    priorities: ["Build Plan claro", "Stack coherente"],
    criteria: ["Viabilidad técnica", "Escalabilidad"],
    specialization: "Ingeniería y arquitectura",
    memory: ["Prefiere MVP acotado antes de features complejas"],
  },
  {
    role: "CPO",
    name: "AI CPO",
    objectives: ["Product-market fit", "PRD accionable"],
    priorities: ["Research antes de PRD", "MVP definido"],
    criteria: ["Claridad de problema", "Diferenciación"],
    specialization: "Producto y UX",
    memory: ["Insiste en validar wedge antes de escalar"],
  },
  {
    role: "CMO",
    name: "AI CMO",
    objectives: ["Go-to-market claro", "Canal de adquisición"],
    priorities: ["ICP definido", "Mensaje diferenciado"],
    criteria: ["Tamaño de mercado", "Canales viables"],
    specialization: "Marketing y posicionamiento",
    memory: ["Recomienda landing antes de paid ads"],
  },
  {
    role: "CFO",
    name: "AI CFO",
    objectives: ["Runway eficiente", "Unit economics"],
    priorities: ["Coste de Build", "Monetización temprana"],
    criteria: ["CAC estimado", "Margen potencial"],
    specialization: "Finanzas y modelo de negocio",
    memory: ["Cuestiona builds sin modelo de pricing"],
  },
  {
    role: "COO",
    name: "AI COO",
    objectives: ["Ejecución fluida", "Procesos claros"],
    priorities: ["Pipeline sin bloqueos", "Handoffs definidos"],
    criteria: ["Tiempo a MVP", "Recursos necesarios"],
    specialization: "Operaciones y ejecución",
    memory: ["Detecta cuellos de botella en Discovery"],
  },
  {
    role: "Legal",
    name: "AI Legal",
    objectives: ["Compliance básico", "Riesgo legal controlado"],
    priorities: ["Términos y privacidad", "Propiedad intelectual"],
    criteria: ["Regulación sectorial", "Datos personales"],
    specialization: "Legal y compliance",
    memory: ["Revisa GDPR en ventures con datos de usuario"],
  },
  {
    role: "Growth",
    name: "AI Growth",
    objectives: ["Tracción temprana", "Loops de crecimiento"],
    priorities: ["Métricas de activación", "Retención"],
    criteria: ["Viralidad potencial", "North Star metric"],
    specialization: "Growth y métricas",
    memory: ["Prioriza ventures con señales de retención"],
  },
  {
    role: "Data",
    name: "AI Data",
    objectives: ["Decisiones basadas en datos", "Señales de mercado"],
    priorities: ["Research completo", "Simulator actualizado"],
    criteria: ["Calidad de datos", "Confianza estadística"],
    specialization: "Analytics y research",
    memory: ["Alerta cuando falta Research o Simulator"],
  },
];

export function getAllBoardMembers(): BoardMemberProfile[] {
  return MEMBER_DEFS.map((m) => ({ ...m, memory: [...m.memory] }));
}

export function getBoardMember(role: BoardMemberRole): BoardMemberProfile | undefined {
  return MEMBER_DEFS.find((m) => m.role === role);
}

export function getActiveMembers(): BoardMemberRole[] {
  return MEMBER_DEFS.map((m) => m.role);
}
