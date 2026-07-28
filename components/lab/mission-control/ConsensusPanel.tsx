"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { AiConversation } from "@/components/ui/fhis/AiConversation";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Progress } from "@/components/ui/fhis/Progress";
import type { ConsensusResult } from "@/lib/intelligence/consensus-engine";
import type { BoardOpinion } from "@/lib/intelligence/consensus-engine";
import {
  JsonBlock,
  SectionTitle,
  consensusLevelVariant,
  formatPct,
} from "./shared";

interface Props {
  consensus: ConsensusResult | null;
  opinions: BoardOpinion[];
}

function countVotes(opinions: BoardOpinion[]) {
  let favor = 0;
  let reservas = 0;
  let desacuerdos = 0;

  for (const op of opinions) {
    const v = op.vote.toLowerCase();
    if (v.includes("reject") || v.includes("deny") || (v.includes("no") && !v.includes("know"))) {
      desacuerdos++;
    } else if (v.includes("defer") || v.includes("condition") || v.includes("pending")) {
      reservas++;
    } else {
      favor++;
    }
  }

  return { favor, reservas, desacuerdos };
}

function levelLabel(level: string): string {
  return level.replace(/_/g, " ");
}

export function ConsensusPanel({ consensus, opinions }: Props) {
  const [showDebate, setShowDebate] = useState(false);
  const votes = countVotes(opinions);

  if (!consensus) {
    return (
      <Panel>
        <SectionTitle>Consensus</SectionTitle>
        <p style={{ opacity: 0.7, margin: 0 }}>Sin consenso calculado — ejecuta el runtime.</p>
      </Panel>
    );
  }

  const debateMessages = opinions.flatMap((op) => [
    { role: "user" as const, content: `[${op.member}] ¿Cuál es tu posición?` },
    {
      role: "assistant" as const,
      content: `${op.opinion}\n\nVoto: ${op.vote} · Confianza: ${formatPct(op.confidence)}`,
    },
  ]);

  return (
    <Panel>
      <SectionTitle>Consensus</SectionTitle>
      <Stack gap="md">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
          <Badge variant={consensusLevelVariant(consensus.level)}>{levelLabel(consensus.level)}</Badge>
          <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
            {"█".repeat(Math.round(consensus.confidence * 10))}
            {"░".repeat(10 - Math.round(consensus.confidence * 10))}{" "}
            {formatPct(consensus.confidence)}
          </span>
        </div>

        <Progress value={consensus.confidence * 100} label="Consensus Meter" showValue />

        <p style={{ margin: 0, fontWeight: 500 }}>{consensus.finalDecision}</p>
        <p style={{ margin: 0, fontSize: "0.8125rem", opacity: 0.75 }}>{consensus.rationale}</p>

        <div style={{ display: "flex", gap: "var(--fhis-space-4)", fontSize: "0.875rem" }}>
          <span>
            A favor: <strong style={{ color: "var(--fhis-color-success, #22c55e)" }}>{votes.favor}</strong>
          </span>
          <span>
            Reservas: <strong style={{ color: "var(--fhis-color-warning, #f59e0b)" }}>{votes.reservas}</strong>
          </span>
          <span>
            Desacuerdos: <strong style={{ color: "var(--fhis-color-error, #ef4444)" }}>{votes.desacuerdos}</strong>
          </span>
        </div>

        {consensus.minorityOpinions.length > 0 && (
          <div>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Opiniones minoritarias</span>
            <ul style={{ margin: "4px 0 0", paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
              {consensus.minorityOpinions.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => setShowDebate((v) => !v)}>
          {showDebate ? "Ocultar debate completo" : "Ver debate completo"}
        </Button>
        {showDebate && (
          <div>
            <AiConversation messages={debateMessages} />
            <div style={{ marginTop: "var(--fhis-space-2)" }}>
              <JsonBlock data={consensus} />
            </div>
          </div>
        )}
      </Stack>
    </Panel>
  );
}
