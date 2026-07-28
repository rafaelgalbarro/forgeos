"use client";

import { useEffect, useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { listFeedbackInbox } from "@/lib/design-partners";
import type { FeedbackInboxItem } from "@/lib/design-partners";
import { Button } from "@/components/ui/fhis/Button";

const SOURCE_LABELS: Record<FeedbackInboxItem["source"], string> = {
  beta: "Beta",
  issue: "Issue",
  feature: "Feature",
  nps: "NPS",
};

export function FeedbackInbox() {
  const [filter, setFilter] = useState<FeedbackInboxItem["source"] | "all">("all");
  const [items, setItems] = useState<FeedbackInboxItem[]>([]);

  useEffect(() => {
    const all = listFeedbackInbox();
    setItems(filter === "all" ? all : all.filter((i) => i.source === filter));
  }, [filter]);

  return (
    <Stack gap="md">
      <div className="fhis-beta-tabs">
        {(["all", "beta", "issue", "feature", "nps"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "ghost"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : SOURCE_LABELS[f]}
          </Button>
        ))}
      </div>
      <div className="fhis-beta-analytics-list">
        {items.length === 0 ? (
          <p className="fhis-beta-empty">Sin entradas en el inbox de feedback.</p>
        ) : (
          items.slice(0, 20).map((item) => (
            <Panel key={item.id} className="fhis-beta-analytics-row">
              <Badge variant="default">{SOURCE_LABELS[item.source]}</Badge>
              <strong>{item.title}</strong>
              <p className="fhis-beta-signup-hint">{item.message}</p>
              {item.page && <span className="fhis-beta-analytics-path">{item.page}</span>}
              <time className="fhis-beta-analytics-time">
                {new Date(item.createdAt).toLocaleString("es-ES")}
              </time>
            </Panel>
          ))
        )}
      </div>
    </Stack>
  );
}
