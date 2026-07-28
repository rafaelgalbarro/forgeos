"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchOs, type OsSearchResult } from "@/lib/os";
import { useOsShell } from "@/lib/os/shell-context";

export function OsUniversalSearch() {
  const { searchOpen, setSearchOpen } = useOsShell();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OsSearchResult[]>([]);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setResults(searchOs(""));
    }
  }, [searchOpen]);

  useEffect(() => {
    setResults(searchOs(query));
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div className="fhis-os-overlay" role="dialog" aria-modal aria-label="Búsqueda universal">
      <button type="button" className="fhis-os-overlay-backdrop" onClick={() => setSearchOpen(false)} />
      <div className="fhis-os-search-panel">
        <input
          autoFocus
          className="fhis-os-palette-input"
          placeholder="Buscar ventures, research, knowledge, builds…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
        />
        <ul className="fhis-os-search-results">
          {results.map((r) => (
            <li key={r.id}>
              <Link href={r.href} onClick={() => setSearchOpen(false)}>
                <strong>{r.title}</strong>
                <span>{r.subtitle}</span>
                <em>{r.category}</em>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
