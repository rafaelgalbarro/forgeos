"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaginatedLogs, PreviewLogEntry } from "@/lib/preview-runtime/types";

interface Props {
  sandboxId: string;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "#94a3b8",
  warn: "#fbbf24",
  error: "#f87171",
  debug: "#64748b",
};

export function PreviewLogViewer({ sandboxId }: Props) {
  const [logs, setLogs] = useState<PreviewLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "build" | "runtime" | "errors">("all");

  const fetchLogs = useCallback(async (nextOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/preview-runtime/${sandboxId}/logs?offset=${nextOffset}&limit=80`);
      if (!res.ok) return;
      const data = (await res.json()) as PaginatedLogs;
      setLogs((prev) => (append ? [...prev, ...data.entries] : data.entries));
      setOffset(nextOffset + data.entries.length);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, [sandboxId]);

  useEffect(() => {
    setOffset(0);
    fetchLogs(0, false);
    const interval = setInterval(() => fetchLogs(0, false), 5000);
    return () => clearInterval(interval);
  }, [sandboxId, fetchLogs]);

  const filtered = logs.filter((l) => {
    if (filter === "errors") return l.level === "error" || l.stream === "stderr";
    if (filter === "build") return l.phase === "build" || l.phase === "install";
    if (filter === "runtime") return l.phase === "runtime";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["all", "build", "runtime", "errors"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              borderRadius: 4,
              border: "1px solid var(--fhis-color-border, #334155)",
              background: filter === f ? "var(--fhis-color-bg-subtle, #1e293b)" : "transparent",
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
        {hasMore && (
          <button type="button" onClick={() => fetchLogs(offset, true)} disabled={loading} style={{ fontSize: "0.75rem" }}>
            {loading ? "…" : "Cargar más"}
          </button>
        )}
      </div>
      <div
        style={{
          maxHeight: 280,
          overflow: "auto",
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.7rem",
          background: "#0f172a",
          borderRadius: 6,
          padding: 8,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: "#64748b" }}>Sin logs</div>
        ) : (
          filtered.map((l) => (
            <div key={l.id} style={{ marginBottom: 2, color: LEVEL_COLORS[l.level] ?? "#94a3b8" }}>
              <span style={{ opacity: 0.6 }}>{l.timestamp.slice(11, 19)}</span>{" "}
              <span style={{ opacity: 0.5 }}>[{l.phase ?? l.stream}]</span> {l.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
