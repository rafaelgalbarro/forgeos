import type { VentureProject } from "@/lib/domain/venture";
import { getAllBoardMembers } from "../member";
import { createBoardSession } from "../session";
import type { BoardEngineOutput } from "../types";

export function runBoardEngine(
  question: string,
  ventures: VentureProject[]
): BoardEngineOutput {
  const session = createBoardSession(question, ventures);
  return {
    session,
    members: getAllBoardMembers(),
  };
}

export function getDefaultBoardQuestion(ventures: VentureProject[]): string {
  if (ventures.length === 0) {
    return "¿Debemos capturar la primera idea del portfolio ahora?";
  }
  return `¿Cuál es la mejor decisión estratégica para ${ventures[0].name}?`;
}
