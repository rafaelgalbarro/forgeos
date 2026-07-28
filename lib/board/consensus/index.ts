import type { BoardConsensus, BoardDebateResult, BoardMemberRole } from "../types";

export function computeConsensus(debate: BoardDebateResult): BoardConsensus {
  const proWeight = debate.pros.reduce((s, a) => s + a.weight, 0);
  const contraWeight = debate.contras.reduce((s, a) => s + a.weight, 0);
  const riskWeight = debate.riesgos.reduce((s, a) => s + a.weight, 0);
  const oppWeight = debate.oportunidades.reduce((s, a) => s + a.weight, 0);

  const net = proWeight + oppWeight - contraWeight - riskWeight * 0.5;
  const score = Math.min(100, Math.max(0, Math.round(50 + net / 10)));

  const supporting = new Set<BoardMemberRole>();
  const dissenting = new Set<BoardMemberRole>();

  debate.pros.forEach((a) => supporting.add(a.member));
  debate.oportunidades.forEach((a) => supporting.add(a.member));
  debate.contras.forEach((a) => dissenting.add(a.member));
  debate.riesgos.forEach((a) => dissenting.add(a.member));

  let label = "Consenso moderado";
  if (score >= 75) label = "Consenso fuerte";
  else if (score < 45) label = "Consenso débil";

  return {
    score,
    label,
    supporting: [...supporting],
    dissenting: [...dissenting].filter((d) => !supporting.has(d)),
  };
}
