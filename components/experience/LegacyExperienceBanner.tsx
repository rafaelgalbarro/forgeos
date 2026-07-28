import Link from "next/link";

/** Discrete banner on legacy experience routes (PROGRAM 6060). */
export function LegacyExperienceBanner({
  surface,
  successorHref = "/mission-control",
  successorLabel = "Mission Control",
}: {
  surface: string;
  successorHref?: string;
  successorLabel?: string;
}) {
  return (
    <aside
      role="status"
      style={{
        marginBottom: 16,
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--fhis-color-border, #d4d0c8)",
        background: "var(--fhis-color-surface-muted, #f5f3ee)",
        fontSize: 13,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>
        <strong>Legacy experience</strong> — {surface}. La entrada V2 es {successorLabel}.
      </span>
      <Link
        href={successorHref}
        style={{
          fontWeight: 600,
          textDecoration: "none",
          color: "var(--fhis-color-accent, #2563eb)",
        }}
      >
        Abrir {successorLabel} →
      </Link>
    </aside>
  );
}
