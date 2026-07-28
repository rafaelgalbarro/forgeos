"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { AiConversation } from "@/components/ui/fhis/AiConversation";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Progress } from "@/components/ui/fhis/Progress";
import { Status } from "@/components/ui/fhis/Status";
import type { BoardMemberId } from "@/lib/ai-orchestration/types";
import type { BoardOpinion } from "@/lib/intelligence/consensus-engine";
import {
  COLLABORATION_PARTICIPANTS,
  runAiCollaborationLab,
  type AiCollaborationLabResult,
} from "@/lib/lab/ai-collaboration-lab";
import {
  SectionTitle,
  confidenceColor,
  consensusLevelVariant,
  formatMs,
  formatPct,
  sourceBadge,
} from "./mission-control/shared";

const MEMBER_ROLES: Record<BoardMemberId, string> = {
  CEO: "Chief Executive Officer",
  CTO: "Chief Technology Officer",
  CPO: "Chief Product Officer",
  CMO: "Chief Marketing Officer",
  CFO: "Chief Financial Officer",
  COO: "Chief Operating Officer",
  Legal: "Legal Counsel",
  Growth: "Growth Lead",
  Research: "Research Lead",
  UX: "UX Lead",
  Architecture: "Architecture Lead",
  Operations: "Operations Lead",
  Data: "Data Lead",
};

function voteVariant(vote: string): "accent" | "amber" | "default" | "blue" {
  const v = vote.toLowerCase();
  if (v.includes("approve") || v.includes("yes")) return "accent";
  if (v.includes("reject") || v.includes("no")) return "default";
  if (v.includes("defer") || v.includes("condition")) return "amber";
  return "blue";
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

function ParticipantSeat({ opinion }: { opinion: BoardOpinion }) {
  return (
    <ExecutiveCard name={opinion.member} role={MEMBER_ROLES[opinion.member] ?? opinion.member}>
      <Stack gap="sm">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <Status
            status={
              opinion.source === "ai"
                ? "success"
                : opinion.source === "mock"
                  ? "warning"
                  : "active"
            }
            label={opinion.source === "ai" ? "AI" : opinion.source === "mock" ? "Mock" : "Heurístico"}
          />
          {sourceBadge(opinion.source)}
        </div>

        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5 }}>{opinion.opinion}</p>

        {opinion.argumentsFor.length > 0 && (
          <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>
            <strong>A favor:</strong> {opinion.argumentsFor.join(" · ")}
          </div>
        )}
        {opinion.argumentsAgainst.length > 0 && (
          <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>
            <strong>En contra:</strong> {opinion.argumentsAgainst.join(" · ")}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            fontSize: "0.75rem",
            paddingTop: "4px",
            borderTop: "1px solid var(--fhis-color-border, #333)",
          }}
        >
          <span>
            Confianza:{" "}
            <strong style={{ color: confidenceColor(opinion.confidence) }}>
              {formatPct(opinion.confidence)}
            </strong>
          </span>
          <Badge variant={voteVariant(opinion.vote)}>{opinion.vote}</Badge>
        </div>

        {opinion.risks.length > 0 && (
          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
            Riesgos: {opinion.risks.slice(0, 2).join(" · ")}
          </p>
        )}
      </Stack>
    </ExecutiveCard>
  );
}

function FounderSeat({ result }: { result: AiCollaborationLabResult }) {
  const { founder } = result;

  return (
    <Panel
      style={{
        border: "1px solid var(--fhis-color-accent, #6366f1)",
        background: "var(--fhis-color-surface-2, #14141a)",
      }}
    >
      <Stack gap="sm">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
          <SectionTitle className="fhis-mb-0">Mesa del Fundador</SectionTitle>
          <Badge variant="accent">Observador / Decisor</Badge>
          {founder.awaitingDecision && <Status status="active" label="Decisión pendiente" />}
        </div>
        <ExecutiveCard name="Founder" role={founder.title}>
          <Stack gap="sm">
            <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5 }}>{founder.stance}</p>
            <p style={{ margin: 0, fontSize: "0.8125rem", opacity: 0.8 }}>
              <strong>Pregunta:</strong> {founder.decisionPrompt}
            </p>
            <p style={{ margin: 0, fontSize: "0.8125rem", opacity: 0.75 }}>
              Recomendación del board: {founder.recommendedAction}
            </p>
          </Stack>
        </ExecutiveCard>
      </Stack>
    </Panel>
  );
}

function ConsensusSummary({ result }: { result: AiCollaborationLabResult }) {
  const [showDebate, setShowDebate] = useState(false);
  const { consensus, participants } = result;

  if (!consensus) {
    return (
      <Panel>
        <SectionTitle>Consenso ejecutivo</SectionTitle>
        <p style={{ opacity: 0.7, margin: 0 }}>Sin consenso — inicia la reunión ejecutiva.</p>
      </Panel>
    );
  }

  const votes = countVotes(participants);
  const debateMessages = participants.flatMap((op) => [
    { role: "user" as const, content: `[${op.member}] Posición ejecutiva` },
    {
      role: "assistant" as const,
      content: `${op.opinion}\n\nArgumentos: ${op.argumentsFor.join(", ") || "—"}\nVoto: ${op.vote} · Confianza: ${formatPct(op.confidence)}`,
    },
  ]);

  return (
    <Panel>
      <SectionTitle>Consenso ejecutivo</SectionTitle>
      <Stack gap="md">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
          <Badge variant={consensusLevelVariant(consensus.level)}>
            {consensus.level.replace(/_/g, " ")}
          </Badge>
          <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
            {"█".repeat(Math.round(consensus.confidence * 10))}
            {"░".repeat(10 - Math.round(consensus.confidence * 10))}{" "}
            {formatPct(consensus.confidence)}
          </span>
        </div>

        <Progress value={consensus.confidence * 100} label="Consensus Meter" showValue />

        <p style={{ margin: 0, fontWeight: 600 }}>{consensus.finalDecision}</p>
        <p style={{ margin: 0, fontSize: "0.8125rem", opacity: 0.75 }}>{consensus.rationale}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--fhis-space-3)",
            fontSize: "0.875rem",
          }}
        >
          <div>
            A favor:{" "}
            <strong style={{ color: "var(--fhis-color-success, #22c55e)" }}>{votes.favor}</strong>
          </div>
          <div>
            Reservas:{" "}
            <strong style={{ color: "var(--fhis-color-warning, #f59e0b)" }}>{votes.reservas}</strong>
          </div>
          <div>
            Desacuerdos:{" "}
            <strong style={{ color: "var(--fhis-color-error, #ef4444)" }}>{votes.desacuerdos}</strong>
          </div>
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
          {showDebate ? "Ocultar resumen de debate" : "Ver resumen de debate"}
        </Button>
        {showDebate && <AiConversation messages={debateMessages} />}
      </Stack>
    </Panel>
  );
}

function DecisionGraphSnippet({ result }: { result: AiCollaborationLabResult }) {
  const nodes = result.decisionGraphNodes;

  return (
    <Panel>
      <SectionTitle>Decision Graph</SectionTitle>
      <Stack gap="sm">
        {nodes.length === 0 ? (
          <p style={{ opacity: 0.7, margin: 0, fontSize: "0.875rem" }}>
            Sin nodos en grafo — la reunión generará entradas tras consenso.
          </p>
        ) : (
          nodes.slice(0, 5).map((node) => (
            <div
              key={node.id}
              style={{
                padding: "var(--fhis-space-2) var(--fhis-space-3)",
                border: "1px solid var(--fhis-color-border, #333)",
                borderRadius: "var(--fhis-radius-sm, 4px)",
                fontSize: "0.8125rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: 4 }}>
                <strong>{node.title}</strong>
                <Badge variant="blue">{node.nodeType}</Badge>
              </div>
              <p style={{ margin: 0, opacity: 0.8 }}>{node.rationale}</p>
              <div style={{ marginTop: 4, fontSize: "0.75rem", opacity: 0.65 }}>
                Confianza {formatPct(node.confidence)} · {new Date(node.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
        {nodes.length > 5 && (
          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
            +{nodes.length - 5} nodos adicionales en grafo
          </p>
        )}
      </Stack>
    </Panel>
  );
}

export function AiCollaborationRoom() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiCollaborationLabResult | null>(null);

  const handleStartMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const meeting = await runAiCollaborationLab();
      setResult(meeting);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--fhis-space-2)",
              marginBottom: "var(--fhis-space-2)",
              flexWrap: "wrap",
            }}
          >
            <Badge variant="accent">Epic 7.4</Badge>
            <Badge variant="default">AI Collaboration Room</Badge>
            <Badge variant="default">Venture Creator</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Sala de Colaboración Ejecutiva</h1>
          <p style={{ opacity: 0.8, maxWidth: 640 }}>
            Sesión estructurada entre ejecutivos — no es un chat. Cada participante aporta opinión,
            argumentos, confianza, riesgos y voto. El Fundador observa y decide.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={handleStartMeeting} disabled={loading}>
                {loading ? "Reunión en curso…" : "Iniciar reunión ejecutiva"}
              </Button>
              <Status
                status={loading ? "active" : result ? "success" : "pending"}
                label={loading ? "Deliberando" : result ? "Sesión completada" : "En espera"}
              />
              {result && sourceBadge(result.source)}
              {result?.fallbackUsed && <Badge variant="amber">Fallback activo</Badge>}
            </div>
            {result && (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                {result.ventureName} · Sesión {result.sessionId?.slice(0, 8) ?? "—"} ·{" "}
                {formatMs(result.latencyMs)} · {COLLABORATION_PARTICIPANTS.length} ejecutivos
              </div>
            )}
            {result?.agenda && (
              <p style={{ margin: 0, fontSize: "0.8125rem", opacity: 0.75 }}>
                <strong>Agenda:</strong> {result.agenda}
              </p>
            )}
            {result?.error && (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--fhis-color-error, #ef4444)" }}>
                {result.error}
              </p>
            )}
          </Stack>
        </Panel>

        {result && (
          <>
            <FounderSeat result={result} />

            <Panel>
              <SectionTitle>Mesa ejecutiva ({COLLABORATION_PARTICIPANTS.length} asientos)</SectionTitle>
              <Grid cols={3} gap="md">
                {result.participants.map((opinion) => (
                  <ParticipantSeat key={opinion.member} opinion={opinion} />
                ))}
              </Grid>
            </Panel>

            <Grid cols={2} gap="lg">
              <ConsensusSummary result={result} />
              <DecisionGraphSnippet result={result} />
            </Grid>

            {result.warnings.length > 0 && (
              <Panel>
                <SectionTitle>Observaciones de sesión</SectionTitle>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem", opacity: 0.8 }}>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
