"use client";

export default function LiveTradingError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", color: "#dde9f7" }}>
      <h2>Live Trading failed</h2>
      <p style={{ color: "#9fb4c9" }}>{error.message}</p>
      <p style={{ color: "#f28e2b", fontSize: "0.85rem" }}>
        Surface remains LOCKED · ANALYSIS_ONLY · no orders sent · retry loads read-only snapshot
      </p>
      <button type="button" className="fhis-btn" onClick={() => reset()}>
        Retry Live Trading
      </button>
    </div>
  );
}
