"use client";

import { useState, useTransition } from "react";
import { createPortfolioBatchAction } from "@/src/core/application/portfolio-command-center/actions";

const DEFAULT_VENTURE = { name: "", slug: "", idea: "", priority: "NORMAL" as const, lifecycle: "DISCOVERING" as const };

export function MultiCreateFlow({ portfolioId, workspaceId }: { portfolioId: string; workspaceId: string }) {
  const [step, setStep] = useState(1);
  const [ventures, setVentures] = useState([DEFAULT_VENTURE]);
  const [startMode, setStartMode] = useState<"DRAFT_ONLY" | "CREATE_AND_PLAN" | "CREATE_AND_START" | "SCHEDULED">("CREATE_AND_PLAN");
  const [result, setResult] = useState<Array<{ name: string; status: string; reason?: string; ventureId?: string }>>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const updateVenture = (index: number, patch: Partial<typeof DEFAULT_VENTURE>) => {
    setVentures((prev) => prev.map((venture, idx) => (idx === index ? { ...venture, ...patch } : venture)));
  };

  return (
    <section className="mc-card" aria-label="Create multiple companies">
      <h2 className="mc-card-title">Create Multiple Companies</h2>
      <p className="mc-card-body">Step {step} of 8</p>
      <div className="pcc-wizard-actions">
        <button type="button" className="fhis-btn" onClick={() => setStep((s) => Math.max(1, s - 1))}>
          Previous
        </button>
        <button type="button" className="fhis-btn" onClick={() => setStep((s) => Math.min(8, s + 1))}>
          Next
        </button>
      </div>

      {ventures.map((venture, index) => (
        <div key={`${index}-${venture.slug}`} className="pcc-wizard-row">
          <input
            aria-label={`venture-name-${index}`}
            value={venture.name}
            onChange={(event) => updateVenture(index, { name: event.target.value })}
            placeholder="Venture name"
            className="ccc-select"
          />
          <input
            aria-label={`venture-slug-${index}`}
            value={venture.slug}
            onChange={(event) => updateVenture(index, { slug: event.target.value })}
            placeholder="venture-slug"
            className="ccc-select"
          />
          <input
            aria-label={`venture-idea-${index}`}
            value={venture.idea}
            onChange={(event) => updateVenture(index, { idea: event.target.value })}
            placeholder="Objective / idea"
            className="ccc-select"
          />
        </div>
      ))}

      <div className="pcc-wizard-actions">
        <button
          type="button"
          className="fhis-btn"
          onClick={() => setVentures((prev) => [...prev, { ...DEFAULT_VENTURE }])}
        >
          Add idea
        </button>
        <select value={startMode} className="ccc-select" onChange={(e) => setStartMode(e.target.value as typeof startMode)}>
          <option value="DRAFT_ONLY">Draft only</option>
          <option value="CREATE_AND_PLAN">Create and plan</option>
          <option value="CREATE_AND_START">Create and start</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
        <button
          type="button"
          className="fhis-btn fhis-btn-primary"
          disabled={isPending}
          onClick={() => {
            setError("");
            startTransition(async () => {
              const payload = ventures.filter((v) => v.name.trim().length > 0 && v.slug.trim().length > 0);
              const response = await createPortfolioBatchAction({
                workspaceId,
                portfolioId,
                startMode,
                ventures: payload,
              });
              if (!response.ok) {
                setError(response.reason);
                setResult([]);
                return;
              }
              setResult(response.results);
            });
          }}
        >
          {isPending ? "Creating…" : "Create portfolio batch"}
        </button>
      </div>
      {error ? <p className="mc-card-body">{error}</p> : null}
      {result.length > 0 ? (
        <ul className="mc-list">
          {result.map((item) => (
            <li key={`${item.name}-${item.ventureId ?? item.status}`}>
              {item.name}: {item.status} {item.reason ? `(${item.reason})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
