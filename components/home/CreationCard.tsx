import Link from "next/link";
import { Card } from "@/components/ui/fhis/Card";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";

interface CreationCardProps {
  icon: string;
  title: string;
  description: string;
  features?: string[];
  ctaLabel: string;
  href?: string;
  available?: boolean;
  comingSoonNote?: string;
}

export function CreationCard({
  icon,
  title,
  description,
  features,
  ctaLabel,
  href,
  available = true,
  comingSoonNote,
}: CreationCardProps) {
  return (
    <Card variant="elevated" padding="md" className="fhis-creation-card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: "1.5rem", lineHeight: 1 }} aria-hidden>
          {icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{title}</h3>
            {!available && <Badge variant="amber">Próximamente</Badge>}
          </div>
          <p style={{ margin: "6px 0 0", color: "var(--fhis-color-text-muted)", fontSize: 14 }}>
            {description}
          </p>
        </div>
      </div>

      {features && features.length > 0 && (
        <ul
          style={{
            margin: "0 0 16px",
            paddingLeft: 18,
            color: "var(--fhis-color-text-muted)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {!available && comingSoonNote && (
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
          {comingSoonNote}
        </p>
      )}

      {available && href ? (
        <Link href={href}>
          <Button variant="primary" size="sm">
            {ctaLabel}
          </Button>
        </Link>
      ) : (
        <Button variant="secondary" size="sm" disabled>
          {ctaLabel}
        </Button>
      )}
    </Card>
  );
}
