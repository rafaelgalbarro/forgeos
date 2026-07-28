"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type {
  ChangeRequest,
  CreationOutput,
  StudioSnapshot,
  VersionComparison,
} from "@/lib/creation-output/types";
import { CREATION_OUTPUT_VERSION } from "@/lib/creation-output/types";
import { getOutputVersions } from "@/lib/creation-output/output-registry";
import { compareVersions } from "@/lib/creation-output/output-versioning";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { OutputSelector } from "./OutputSelector";
import { VersionSelector } from "./VersionSelector";
import { ValidationPanel, VersionComparePanel } from "./ValidationPanel";
import { StudioActionsPanel } from "./StudioActionsPanel";
import { StructurePanel } from "./StructurePanel";
import { MULTI_OUTPUT_VERSION } from "@/lib/multi-output/types";

const PreviewDeploymentPanel = dynamic(
  () => import("@/components/preview-deployment/PreviewDeploymentPanel").then((m) => m.PreviewDeploymentPanel),
  { ssr: false }
);

const MultiOutputTreeMap = dynamic(
  () => import("./MultiOutputTreeMap").then((m) => m.MultiOutputTreeMap),
  { ssr: false, loading: () => <div style={{ padding: 16, fontSize: "0.8rem" }}>Cargando árbol…</div> }
);

const OutputPreviewPanel = dynamic(
  () => import("./OutputPreviewPanel").then((m) => m.OutputPreviewPanel),
  {
    ssr: false,
    loading: () => (
      <div className="fhis-empty-state" style={{ padding: 48 }}>
        <div className="fhis-empty-state-title">Cargando preview…</div>
      </div>
    ),
  }
);

const DeliveryStudioTabs = dynamic(
  () => import("./DeliveryStudioTabs").then((m) => m.DeliveryStudioTabs),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 12, fontSize: "0.8rem" }}>Cargando Delivery Studio V2…</div>
    ),
  }
);

interface Props {
  initialSnapshot: StudioSnapshot;
  initialType?: string;
}

export function CreationOutputStudioClient({ initialSnapshot, initialType }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedOutput, setSelectedOutput] = useState<CreationOutput | null>(() => {
    const byType = initialType
      ? initialSnapshot.outputs.find((o) => o.type === initialType)
      : undefined;
    const byId = initialSnapshot.selectedOutputId
      ? initialSnapshot.outputs.find((o) => o.outputId === initialSnapshot.selectedOutputId)
      : undefined;
    return byType ?? byId ?? initialSnapshot.outputs[0] ?? null;
  });
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [multiPlan, setMultiPlan] = useState<import("@/lib/multi-output/types").MultiOutputPlan | null>(null);
  const [showTree, setShowTree] = useState(true);

  const versions = useMemo(() => {
    if (!selectedOutput) return [];
    return getOutputVersions(snapshot.missionId, selectedOutput.type);
  }, [selectedOutput, snapshot.missionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    import("@/lib/creation-output/output-repository").then(({ seedMemoryOutputs }) => {
      seedMemoryOutputs(snapshot.outputs);
    });
    import("@/lib/multi-output").then(({ ensureMultiOutputPlan }) => {
      ensureMultiOutputPlan(snapshot.missionId, undefined, snapshot.ventureSlug).then(setMultiPlan);
    });
  }, [snapshot.outputs, snapshot.missionId, snapshot.ventureSlug]);

  const handleSelectOutput = useCallback((output: CreationOutput) => {
    setSelectedOutput(output);
    setComparison(null);
  }, []);

  const handleVersionSelect = useCallback((output: CreationOutput) => {
    setSelectedOutput(output);
  }, []);

  const handleCompare = useCallback((a: CreationOutput, b: CreationOutput) => {
    const comp = compareVersions(a, b);
    setComparison(comp);
    setSnapshot((s) => ({ ...s, comparisons: [...s.comparisons, comp] }));
  }, []);

  const handleOutputChange = useCallback((output: CreationOutput) => {
    setSelectedOutput(output);
    setSnapshot((s) => ({
      ...s,
      outputs: s.outputs.map((o) => (o.outputId === output.outputId ? output : o)),
    }));
  }, []);

  const handleChangeRequestCreated = useCallback((cr: ChangeRequest) => {
    setSnapshot((s) => ({ ...s, changeRequests: [...s.changeRequests, cr] }));
  }, []);

  return (
    <OsModuleFrame
      title="Creation Output Studio"
      description={`${CREATION_OUTPUT_VERSION} · ${MULTI_OUTPUT_VERSION}`}
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/mission-control" style={{ fontSize: "0.8rem" }}>← Mission Control</Link>
        <Link href={`/mission-control/${snapshot.missionId}`} style={{ fontSize: "0.8rem" }}>
          Misión {snapshot.missionId}
        </Link>
        <Link href={`/studio/${snapshot.missionId}/code`} style={{ fontSize: "0.8rem", fontWeight: 600 }}>
          Código →
        </Link>
        {snapshot.ventureSlug && (
          <Link href={`/ventures/${snapshot.ventureSlug}`} style={{ fontSize: "0.8rem" }}>
            Venture {snapshot.ventureSlug}
          </Link>
        )}
        <Link href={`/studio/${snapshot.missionId}/preview`} style={{ fontSize: "0.8rem" }}>
          Preview Sandbox
        </Link>
      </div>

      {showTree && multiPlan && (
        <div style={{ marginBottom: 16 }}>
          <MultiOutputTreeMap
            plan={multiPlan}
            onSelectKind={(kind) => {
              const output = snapshot.outputs.find(
                (o) => o.type === multiPlan.outputs.find((p) => p.kind === kind)?.creationOutputType
              );
              if (output) handleSelectOutput(output);
            }}
          />
          <button
            type="button"
            onClick={() => setShowTree(false)}
            style={{ fontSize: "0.7rem", marginTop: 4, background: "none", border: "none", cursor: "pointer", color: "var(--fhis-color-text-muted)" }}
          >
            Ocultar árbol
          </button>
        </div>
      )}
      {!showTree && (
        <button
          type="button"
          onClick={() => setShowTree(true)}
          style={{ fontSize: "0.75rem", marginBottom: 12, background: "none", border: "none", cursor: "pointer", color: "var(--fhis-color-accent)" }}
        >
          Mostrar árbol de entregables
        </button>
      )}

      <OutputSelector
        outputs={snapshot.outputs}
        selectedId={selectedOutput?.outputId}
        onSelect={handleSelectOutput}
      />

      {selectedOutput && (
        <>
          <div style={{ margin: "16px 0" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>{selectedOutput.title}</h2>
            <VersionSelector
              versions={versions}
              selectedVersion={selectedOutput.version}
              onSelect={handleVersionSelect}
              onCompare={handleCompare}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 300px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div>
              <OutputPreviewPanel output={selectedOutput} missionId={snapshot.missionId} />
            </div>
            <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ValidationPanel output={selectedOutput} />
              <StructurePanel output={selectedOutput} />
              <StudioActionsPanel
                output={selectedOutput}
                changeRequests={snapshot.changeRequests}
                onOutputChange={handleOutputChange}
                onChangeRequestCreated={handleChangeRequestCreated}
              />
              {(selectedOutput.type === "DEPLOYMENT_OUTPUT" ||
                selectedOutput.type === "WEBSITE_OUTPUT" ||
                selectedOutput.type === "WEB_APPLICATION_OUTPUT") && (
                <PreviewDeploymentPanel
                  missionId={snapshot.missionId}
                  ventureId={snapshot.ventureSlug}
                  projectId={selectedOutput.factoryProjectId ?? selectedOutput.outputId}
                />
              )}
              <VersionComparePanel comparison={comparison} />
            </aside>
          </div>
        </>
      )}

      <DeliveryStudioTabs missionId={snapshot.missionId} />
    </OsModuleFrame>
  );
}
