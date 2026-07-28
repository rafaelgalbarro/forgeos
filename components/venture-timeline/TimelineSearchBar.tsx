"use client";

import { cn } from "@/lib/design-system/cn";

interface TimelineSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export function TimelineSearchBar({ value, onChange, resultCount }: TimelineSearchBarProps) {
  return (
    <div className="fhis-vtl-search">
      <input
        type="search"
        className={cn("fhis-input", "fhis-vtl-search-input")}
        placeholder="Buscar en título y descripción…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Buscar eventos del timeline"
      />
      {value.trim() && resultCount !== undefined && (
        <span className="fhis-vtl-search-count">
          {resultCount} resultado{resultCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
