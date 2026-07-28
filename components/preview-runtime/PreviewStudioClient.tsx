"use client";

import Link from "next/link";
import { useState } from "react";
import type { CreationOutput } from "@/lib/creation-output/types";
import { PREVIEW_RUNTIME_VERSION } from "@/lib/preview-runtime/types";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { PreviewSandboxPanel } from "./PreviewSandboxPanel";
import { OutputSelector } from "@/components/creation-output-studio/OutputSelector";

interface Props {
  missionId: string;
  ventureSlug?: string;
  outputs: CreationOutput[];
  selectedOutput: CreationOutput | null;
}

export function PreviewStudioClient({ missionId, ventureSlug, outputs, selectedOutput: initial }: Props) {
  const [selected, setSelected] = useState<CreationOutput | null>(initial);

  const previewable = outputs.filter(
    (o) => !["VENTURE_OUTPUT", "DEPLOYMENT_OUTPUT"].includes(o.type)
  );

  return (
    <OsModuleFrame title="Preview Sandbox" description={PREVIEW_RUNTIME_VERSION}>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`/studio/${missionId}`} style={{ fontSize: "0.8rem" }}>← Output Studio</Link>
        <Link href="/mission-control" style={{ fontSize: "0.8rem" }}>Mission Control</Link>
        {ventureSlug && (
          <Link href={`/ventures/${ventureSlug}`} style={{ fontSize: "0.8rem" }}>Venture</Link>
        )}
        <Link href="/lab/preview-runtime" style={{ fontSize: "0.8rem" }}>Lab</Link>
      </div>

      <OutputSelector
        outputs={previewable}
        selectedId={selected?.outputId}
        onSelect={setSelected}
      />

      {selected ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 12px" }}>{selected.title}</h2>
          <PreviewSandboxPanel missionId={missionId} output={selected} />
        </div>
      ) : (
        <p style={{ marginTop: 16, fontSize: "0.85rem" }}>Selecciona un output para iniciar el sandbox.</p>
      )}
    </OsModuleFrame>
  );
}
