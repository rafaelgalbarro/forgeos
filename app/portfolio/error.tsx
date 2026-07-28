"use client";

export default function PortfolioError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <h2>Portfolio section failed</h2>
      <p>{error.message}</p>
      <button type="button" className="fhis-btn" onClick={() => reset()}>
        Retry section
      </button>
    </div>
  );
}
