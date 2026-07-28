"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { filterOsCommands, type OsCommand } from "@/lib/os";
import { useOsShell } from "@/lib/os/shell-context";

export function OsCommandPalette() {
  const { commandOpen, setCommandOpen, setSearchOpen } = useOsShell();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OsCommand[]>([]);

  useEffect(() => {
    if (commandOpen) {
      setQuery("");
      setResults(filterOsCommands(""));
    }
  }, [commandOpen]);

  useEffect(() => {
    setResults(filterOsCommands(query));
  }, [query]);

  if (!commandOpen) return null;

  function run(cmd: OsCommand) {
    setCommandOpen(false);
    if (cmd.action === "search") {
      setSearchOpen(true);
      return;
    }
    if (cmd.href) router.push(cmd.href);
  }

  return (
    <div className="fhis-os-overlay" role="dialog" aria-modal aria-label="Command Palette">
      <button type="button" className="fhis-os-overlay-backdrop" onClick={() => setCommandOpen(false)} />
      <div className="fhis-os-palette">
        <input
          autoFocus
          className="fhis-os-palette-input"
          placeholder="Crear venture, buscar, lanzar build…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setCommandOpen(false);
            if (e.key === "Enter" && results[0]) run(results[0]);
          }}
        />
        <ul className="fhis-os-palette-list">
          {results.map((cmd) => (
            <li key={cmd.id}>
              <button type="button" onClick={() => run(cmd)}>
                <strong>{cmd.label}</strong>
                {cmd.description && <span>{cmd.description}</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="fhis-os-palette-hint">Ctrl+K · Enter para ejecutar · Esc para cerrar</p>
      </div>
    </div>
  );
}
