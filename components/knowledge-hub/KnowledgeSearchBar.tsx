"use client";

import { cn } from "@/lib/design-system/cn";

interface KnowledgeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export function KnowledgeSearchBar({ value, onChange, resultCount }: KnowledgeSearchBarProps) {
  return (
    <div className="fhis-kh-search">
      <input
        type="search"
        className={cn("fhis-input", "fhis-kh-search-input")}
        placeholder="Buscar documentos…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Buscar en knowledge hub"
      />
      {value.trim() && resultCount !== undefined && (
        <span className="fhis-kh-search-count">
          {resultCount} documento{resultCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
