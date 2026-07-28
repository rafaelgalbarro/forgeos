"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import { isStartupCommand } from "@/lib/live-ai";

interface Props {
  onSubmit: (command: string) => void;
  onCancel?: () => void;
  running: boolean;
  disabled?: boolean;
}

export function LiveInputBar({ onSubmit, onCancel, running, disabled }: Props) {
  const [command, setCommand] = useState("Crea una startup de gestión de flotas");
  const valid = isStartupCommand(command);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || running || disabled) return;
    onSubmit(command.trim());
  }

  return (
    <form className="fhis-live-input-bar" onSubmit={handleSubmit}>
      <div className="fhis-live-input-row">
        <input
          className="fhis-input fhis-live-input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='Ej: "Crea una startup de gestión de flotas"'
          disabled={running || disabled}
          aria-label="Comando para simulación"
        />
        <Button type="submit" loading={running} disabled={!valid || disabled}>
          {running ? "Simulando…" : "Iniciar simulación"}
        </Button>
        {running && onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
      <div className="fhis-live-input-meta">
        <Badge variant="default">Dry-run</Badge>
        <Badge variant="accent">RC5.5</Badge>
        <span className="fhis-live-input-hint">
          Sin ejecución real — solo visualización del pipeline
        </span>
      </div>
    </form>
  );
}
