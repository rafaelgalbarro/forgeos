"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { LinkedInPost } from "@/lib/mission-control/go-to-market/types";

interface Props {
  posts: LinkedInPost[];
}

export function LinkedInPlanView({ posts }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Plan LinkedIn" subtitle="Programación, audiencia y mensajes" />
        {posts.map((p) => (
          <section key={p.id} style={{ padding: 10, border: "1px solid var(--fhis-color-border, #e5e7eb)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <Badge variant="amber">S{p.week} · {p.day}</Badge>
              <Badge variant="default">{p.format}</Badge>
            </div>
            <strong style={{ fontSize: "0.875rem" }}>{p.headline}</strong>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8125rem", margin: "8px 0", fontFamily: "inherit" }}>{p.body}</pre>
            <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>Audiencia: {p.audience}</div>
            <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{p.hashtags.join(" ")}</div>
          </section>
        ))}
      </Stack>
    </Panel>
  );
}
