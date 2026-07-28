"use client";

import { useState } from "react";
import type { CreationOutput, MobileApplicationOutputPayload } from "@/lib/creation-output/types";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  output: CreationOutput;
}

export function StudioMobilePreview({ output }: Props) {
  const payload = output.payload as MobileApplicationOutputPayload | undefined;
  const [device, setDevice] = useState<"iphone" | "android">("iphone");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [screen, setScreen] = useState(payload?.screens[0]?.id ?? "home");

  const frameWidth = orientation === "portrait" ? (device === "iphone" ? 280 : 270) : 400;
  const frameHeight = orientation === "portrait" ? 560 : 280;

  return (
    <Panel>
      <SectionHeader title="Mobile Preview" subtitle="Device frame — Expo Preview Plan (no APK)" />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={() => setDevice("iphone")}>
          📱 iPhone
        </button>
        <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={() => setDevice("android")}>
          🤖 Android
        </button>
        <button
          type="button"
          className="fhis-btn fhis-btn-ghost fhis-btn-sm"
          onClick={() => setOrientation((o) => (o === "portrait" ? "landscape" : "portrait"))}
        >
          {orientation === "portrait" ? "↻ Landscape" : "↻ Portrait"}
        </button>
        <Badge variant="default">{output.previewMode}</Badge>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div
          style={{
            width: frameWidth,
            height: frameHeight,
            borderRadius: device === "iphone" ? 36 : 24,
            border: "8px solid #1a1a1a",
            background: "#fff",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ height: 24, background: "#1a1a1a", flexShrink: 0 }} />
          <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {payload?.screens.find((s) => s.id === screen)?.label ?? "Pantalla"}
            </h3>
            <p style={{ fontSize: 12, color: "#666" }}>Demo flow — datos simulados</p>
            <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 8, fontSize: 12 }}>
              Offline: {payload?.offlineState ?? "N/A"}
            </div>
          </div>
          <div style={{ display: "flex", borderTop: "1px solid #eee", padding: "8px 0" }}>
            {(payload?.screens ?? []).slice(0, 4).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScreen(s.id)}
                style={{
                  flex: 1,
                  border: "none",
                  background: screen === s.id ? "#eff6ff" : "transparent",
                  fontSize: 10,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, fontSize: "0.8rem" }}>
          <p><strong>Permisos:</strong> {(payload?.permissions ?? []).join(", ")}</p>
          <p><strong>API deps:</strong> {(payload?.apiDependencies ?? []).join(", ")}</p>
          <p><strong>Expo plan:</strong> {payload?.expoPreviewPlan}</p>
        </div>
      </div>
    </Panel>
  );
}
