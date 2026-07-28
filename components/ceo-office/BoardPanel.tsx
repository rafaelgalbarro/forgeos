"use client";

import type { BoardEngineOutput } from "@/lib/board/types";

interface BoardPanelProps {
  board: BoardEngineOutput;
}

export function BoardPanel({ board }: BoardPanelProps) {
  const { session, members } = board;
  const { decision } = session;
  const { debate, consensus } = decision;

  return (
    <section className="board-panel glass">
      <div className="ceo-section-head">
        <h2>Executive Board</h2>
        <span className="board-consensus-badge">{consensus.label}</span>
      </div>

      <p className="board-question">{decision.question}</p>

      <div className="board-members-row">
        {members.map((m) => (
          <span key={m.role} className="board-member-chip" title={m.specialization}>
            {m.role}
          </span>
        ))}
      </div>

      <div className="board-debate-grid">
        <div className="board-debate-col board-pros">
          <h3>Pros</h3>
          <ul>
            {debate.pros.map((a, i) => (
              <li key={`pro-${i}`}>
                <strong>{a.member}:</strong> {a.point}
              </li>
            ))}
          </ul>
        </div>
        <div className="board-debate-col board-contras">
          <h3>Contras</h3>
          <ul>
            {debate.contras.map((a, i) => (
              <li key={`con-${i}`}>
                <strong>{a.member}:</strong> {a.point}
              </li>
            ))}
          </ul>
        </div>
        <div className="board-debate-col board-riesgos">
          <h3>Riesgos</h3>
          <ul>
            {debate.riesgos.map((a, i) => (
              <li key={`risk-${i}`}>
                <strong>{a.member}:</strong> {a.point}
              </li>
            ))}
          </ul>
        </div>
        <div className="board-debate-col board-oportunidades">
          <h3>Oportunidades</h3>
          <ul>
            {debate.oportunidades.map((a, i) => (
              <li key={`opp-${i}`}>
                <strong>{a.member}:</strong> {a.point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="board-decision">
        <div className="board-consensus">
          <span className="board-consensus-score">{consensus.score}%</span>
          <span>Consenso del board</span>
        </div>
        <div className="board-final">
          <h3>Decisión Final</h3>
          <p className="board-final-text">{decision.finalDecision}</p>
          <p className="board-final-rationale">{decision.rationale}</p>
        </div>
      </div>
    </section>
  );
}
