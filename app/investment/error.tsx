"use client";

export default function InvestmentError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", color: "#dde9f7" }}>
      <h2>Investment Hub failed</h2>
      <p style={{ color: "#9fb4c9" }}>{error.message}</p>
      <p style={{ color: "#59c48e", fontSize: "0.85rem" }}>
        ANALYSIS_ONLY · orders disabled · retry loads shell without waiting on IBKR
      </p>
      <button type="button" className="fhis-btn" onClick={() => reset()}>
        Retry Investment Hub
      </button>
    </div>
  );
}
