"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Select } from "@/components/ui/fhis/Select";
import { Switch } from "@/components/ui/fhis/Switch";
import { Button } from "@/components/ui/fhis/Button";
import { updateUserPreferences } from "@/lib/workspace";
import type { UserPreferences } from "@/lib/workspace";
import { useAuth } from "./AuthProvider";

export function SettingsView() {
  const { session, workspace, refresh } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(
    workspace?.preferences ?? {
      locale: "es",
      theme: "system",
      emailNotifications: true,
      aiCostAlerts: true,
      defaultOptimizer: "balanced",
    }
  );
  const [message, setMessage] = useState("");

  if (!session) {
    return (
      <Container>
        <p>Inicia sesión para configurar preferencias.</p>
        <Link href="/login">Login</Link>
      </Container>
    );
  }

  const userId = session.userId;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateUserPreferences(userId, prefs);
    setMessage("Preferencias guardadas.");
    refresh();
  }

  return (
    <Container>
      <SectionHeader title="Configuración" subtitle="Preferencias de cuenta y IA" />
      <Panel>
        <form onSubmit={handleSave} className="fhis-auth-form">
          <Select
            label="Idioma"
            value={prefs.locale}
            onChange={(e) => setPrefs({ ...prefs, locale: e.target.value })}
            options={[
              { value: "es", label: "Español" },
              { value: "en", label: "English" },
            ]}
          />
          <Select
            label="Tema"
            value={prefs.theme}
            onChange={(e) =>
              setPrefs({ ...prefs, theme: e.target.value as UserPreferences["theme"] })
            }
            options={[
              { value: "system", label: "Sistema" },
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
          <Select
            label="Optimizador IA por defecto"
            value={prefs.defaultOptimizer}
            onChange={(e) =>
              setPrefs({
                ...prefs,
                defaultOptimizer: e.target.value as UserPreferences["defaultOptimizer"],
              })
            }
            options={[
              { value: "balanced", label: "Balanceado" },
              { value: "cost", label: "Coste" },
              { value: "quality", label: "Calidad" },
              { value: "latency", label: "Latencia" },
            ]}
          />
          <Switch
            label="Notificaciones email"
            checked={prefs.emailNotifications}
            onChange={(checked) => setPrefs({ ...prefs, emailNotifications: checked })}
          />
          <Switch
            label="Alertas de coste IA"
            checked={prefs.aiCostAlerts}
            onChange={(checked) => setPrefs({ ...prefs, aiCostAlerts: checked })}
          />
          {message && <p className="fhis-auth-success">{message}</p>}
          <Button type="submit">Guardar preferencias</Button>
        </form>
      </Panel>
    </Container>
  );
}
