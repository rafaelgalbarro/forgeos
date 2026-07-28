"use client";

import dynamic from "next/dynamic";
import type { ExecutiveBoardSession, ExecutiveCouncilSummary } from "@/lib/mission-control/types";

const ExecutiveBoardReview = dynamic(
  () => import("./ExecutiveBoardReview").then((m) => m.ExecutiveBoardReview),
  { ssr: false }
);

interface Props {
  council: ExecutiveCouncilSummary | undefined;
  session: ExecutiveBoardSession | undefined;
  visible: boolean;
}

/** Legacy banner + PROGRAM 5400 expandable board panel. */
export function ExecutiveCouncilBanner({ council, session, visible }: Props) {
  if (!visible) return null;

  if (session && session.status !== "idle") {
    return <ExecutiveBoardReview session={session} visible={visible} />;
  }

  if (!council) return null;

  return (
    <div
      style={{
        margin: "12px 16px",
        padding: 12,
        borderRadius: 8,
        background: "var(--fhis-color-info-bg, #eff6ff)",
        border: "1px solid var(--fhis-color-info-border, #bfdbfe)",
      }}
    >
      <strong>{council.headline}</strong>
      <p style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>
        {council.summary} — Departamentos: {council.departments.join(", ")}
      </p>
    </div>
  );
}
