"use client";

import { useMemo } from "react";
import type { ExecutiveBoardSession } from "@/lib/mission-control/types";
import { BOARD_PARTICIPANTS } from "@/lib/mission-control/executive-board/board-participants";

interface Props {
  session: ExecutiveBoardSession | undefined;
  visible: boolean;
}

function DepartmentSpinner({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 8,
        background: done ? "var(--fhis-color-success-bg, #ecfdf5)" : active ? "var(--fhis-color-info-bg, #eff6ff)" : "var(--fhis-color-surface, #f8fafc)",
        fontSize: "0.8rem",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          border: active ? "2px solid var(--fhis-color-primary, #2563eb)" : "2px solid transparent",
          borderTopColor: active ? "transparent" : done ? "var(--fhis-color-success, #059669)" : "var(--fhis-color-text-muted, #94a3b8)",
          animation: active ? "fhis-spin 0.8s linear infinite" : undefined,
          background: done ? "var(--fhis-color-success, #059669)" : active ? "transparent" : "var(--fhis-color-text-muted, #cbd5e1)",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

export function ExecutiveBoardReview({ session, visible }: Props) {
  const reviewing = session?.status === "reviewing";
  const ready = session?.status === "ready" && session.summary;

  const departmentStates = useMemo(() => {
    if (!session) return [];
    return BOARD_PARTICIPANTS.map((p) => {
      const review = session.reviews.find((r) => r.department === p.id);
      const active = session.activeDepartments.includes(p.id);
      const done = !!review;
      return { id: p.id, label: p.label, active, done };
    });
  }, [session]);

  if (!visible || !session || session.status === "idle") return null;

  return (
    <div
      className="fhis-executive-board-review"
      style={{
        margin: "12px 16px",
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--fhis-color-border, #e2e8f0)",
        background: "var(--fhis-color-surface-elevated, #fff)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <style>{`@keyframes fhis-spin { to { transform: rotate(360deg); } }`}</style>

      {reviewing && (
        <>
          <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
            El Consejo Ejecutivo está evaluando alternativas…
          </p>
          <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "var(--fhis-color-text-muted)" }}>
            Executive Board Reviewing…
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {departmentStates.map((d) => (
              <DepartmentSpinner key={d.id} label={d.label} active={d.active} done={d.done} />
            ))}
          </div>
        </>
      )}

      {ready && session.summary && (
        <>
          <p style={{ margin: "0 0 12px", fontWeight: 600 }}>
            {session.summary.headline} ({session.summary.confidence}% confianza)
          </p>

          <section style={{ marginBottom: 12 }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>Recomendación final</h4>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{session.summary.finalRecommendation}</p>
          </section>

          {session.summary.alternatives.length > 0 && (
            <section style={{ marginBottom: 12 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>Alternativas</h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem" }}>
                {session.summary.alternatives.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </section>
          )}

          {session.summary.risks.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>Riesgos</h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem" }}>
                {session.summary.risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
