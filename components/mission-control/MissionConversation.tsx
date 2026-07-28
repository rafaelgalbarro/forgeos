"use client";

import { AiConversation } from "@/components/ui/fhis/AiConversation";
import { Button } from "@/components/ui/fhis/Button";
import { Input } from "@/components/ui/fhis/Input";
import { Panel, Stack, Grid } from "@/components/ui/fhis/Layout";
import { Card } from "@/components/ui/fhis/Card";
import { Badge } from "@/components/ui/fhis/Badge";
import type { Mission } from "@/lib/mission-control/types";

const INTENTION_CARDS = [
  { id: "venture", icon: "🏢", label: "Crear Empresa" },
  { id: "website", icon: "🌐", label: "Crear Sitio Web" },
  { id: "application", icon: "💻", label: "Crear Aplicación" },
  { id: "mobile", icon: "📱", label: "Crear App Móvil" },
  { id: "discovery", icon: "💡", label: "Descubrir Oportunidad" },
] as const;

const EXAMPLE_CHIPS = [
  "Quiero lanzar un SaaS de productividad",
  "Necesito una landing para mi startup",
  "App de reservas para restaurantes",
];

interface Props {
  mission: Mission;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onCardSelect: (cardId: string) => void;
  onChipClick: (text: string) => void;
  loading?: boolean;
}

export function MissionConversation({
  mission,
  input,
  onInputChange,
  onSubmit,
  onCardSelect,
  onChipClick,
  loading,
}: Props) {
  const messages = mission.messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.role === "ceo" ? `CEO: ${m.content}` : m.content,
  }));

  return (
    <Panel className="fhis-mc-conversation">
      <Stack gap="lg">
        <header style={{ textAlign: "center" }}>
          <Badge variant="accent">Mission Control</Badge>
          <h2 style={{ fontSize: "1.5rem", margin: "12px 0 8px", fontWeight: 600 }}>
            ¿Qué quieres construir hoy?
          </h2>
        </header>

        <div style={{ display: "flex", gap: 8 }}>
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Describe tu idea, problema o proyecto..."
            onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
            style={{ flex: 1 }}
          />
          <Button variant="primary" onClick={onSubmit} disabled={loading}>
            Enviar
          </Button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipClick(chip)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--fhis-color-border)",
                background: "var(--fhis-color-surface)",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        <Grid cols={3} gap="sm">
          {INTENTION_CARDS.map((card) => (
            <Card
              key={card.id}
              className="fhis-mc-intention-card"
              style={{ cursor: "pointer", textAlign: "center", padding: 16 }}
              onClick={() => onCardSelect(card.id)}
            >
              <div style={{ fontSize: "1.5rem" }}>{card.icon}</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, marginTop: 8 }}>{card.label}</div>
            </Card>
          ))}
        </Grid>

        {messages.length > 0 && (
          <AiConversation messages={messages} />
        )}
      </Stack>
    </Panel>
  );
}
