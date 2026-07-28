"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import type { BoardMemberId } from "@/lib/ai-orchestration/types";
import type { BoardOpinion } from "@/lib/intelligence/consensus-engine";
import {
  JsonBlock,
  SectionTitle,
  confidenceColor,
  formatPct,
  sourceBadge,
} from "./shared";

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

interface Props {
  members: BoardMemberId[];
  opinions: BoardOpinion[];
}

function memberStatus(opinion: BoardOpinion | undefined) {
  if (!opinion) return { status: "pending" as const, label: "Pendiente" };
  if (opinion.source === "ai") return { status: "success" as const, label: "AI" };
  if (opinion.source === "mock") return { status: "warning" as const, label: "Mock" };
  return { status: "active" as const, label: "Heurístico" };
}

function voteVariant(vote: string): "accent" | "amber" | "default" | "blue" {
  const v = vote.toLowerCase();
  if (v.includes("approve") || v.includes("yes")) return "accent";
  if (v.includes("reject") || v.includes("no")) return "default";
  if (v.includes("defer") || v.includes("condition")) return "amber";
  return "blue";
}

function MemberCard({ member, opinion }: { member: BoardMemberId; opinion?: BoardOpinion }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const estado = memberStatus(opinion);

  return (
    <ExecutiveCard name={member} role={MEMBER_ROLES[member] ?? member}>
      <Stack gap="sm">
        <Status status={estado.status} label={estado.label} />
        {opinion ? (
          <>
            <p style={{ margin: 0, fontSize: "0.8125rem", lineHeight: 1.4 }}>{opinion.opinion}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", fontSize: "0.75rem" }}>
              <span>
                Conf:{" "}
                <strong style={{ color: confidenceColor(opinion.confidence) }}>
                  {formatPct(opinion.confidence)}
                </strong>
              </span>
              <Badge variant={voteVariant(opinion.vote)}>{opinion.vote}</Badge>
              {sourceBadge(opinion.source)}
            </div>
            {opinion.risks[0] && (
              <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                Riesgo: {opinion.risks[0]}
              </p>
            )}
            {opinion.suggestedAction && (
              <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                Prioridad: {opinion.suggestedAction}
              </p>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowReasoning((v) => !v)}>
              {showReasoning ? "Ocultar razonamiento" : "Ver razonamiento"}
            </Button>
            {showReasoning && <JsonBlock data={opinion} />}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: "0.8125rem", opacity: 0.5 }}>Sin opinión registrada</p>
        )}
      </Stack>
    </ExecutiveCard>
  );
}

export function ExecutiveBoard({ members, opinions }: Props) {
  const opinionMap = new Map(opinions.map((o) => [o.member, o]));

  return (
    <Panel>
      <SectionTitle>Executive Board ({members.length} miembros)</SectionTitle>
      <Grid cols={3} gap="md">
        {members.map((member) => (
          <MemberCard key={member} member={member} opinion={opinionMap.get(member)} />
        ))}
      </Grid>
    </Panel>
  );
}
