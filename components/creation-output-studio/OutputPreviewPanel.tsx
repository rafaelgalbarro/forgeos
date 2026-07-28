"use client";

import { useEffect, useState } from "react";
import type { CreationOutput } from "@/lib/creation-output/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { UnavailableState } from "@/components/ui/UnavailableState";
import { VentureCompanyRoom } from "./VentureCompanyRoom";
import { BackendTechView } from "./BackendTechView";
import { DeploymentPreviewView } from "./DeploymentPreviewView";
import { StudioAppPreview } from "./StudioAppPreview";
import { StudioWebsitePreview } from "./StudioWebsitePreview";
import { StudioMobilePreview } from "./StudioMobilePreview";

interface Props {
  output: CreationOutput;
  missionId: string;
}

export function OutputPreviewPanel({ output, missionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(false);
  }, [output.outputId]);

  if (output.status === "GENERATING") {
    return <LoadingState title="Generando output…" description="El pipeline está en curso." />;
  }

  if (output.status === "FAILED") {
    return <UnavailableState toolName="Preview" reason="La generación falló. Revisa artefactos en Mission Control." />;
  }

  if (output.previewMode === "unavailable") {
    return <UnavailableState toolName="Preview" reason="Preview no disponible para este output." />;
  }

  switch (output.type) {
    case "VENTURE_OUTPUT":
      if (output.payload && "executiveSummary" in output.payload) {
        return <VentureCompanyRoom payload={output.payload} missionId={missionId} />;
      }
      return <UnavailableState toolName="Company Room" reason="Payload venture no disponible." />;

    case "WEBSITE_OUTPUT":
      return (
        <StudioWebsitePreview
          projectId={output.factoryProjectId}
          output={output}
          onError={setError}
        />
      );

    case "WEB_APPLICATION_OUTPUT":
      return (
        <StudioAppPreview
          projectId={output.factoryProjectId}
          output={output}
          onError={setError}
        />
      );

    case "MOBILE_APPLICATION_OUTPUT":
      return <StudioMobilePreview output={output} />;

    case "BACKEND_OUTPUT": {
      const payload = output.payload;
      if (payload && "dbSchema" in payload && "apiEndpoints" in payload) {
        return <BackendTechView payload={payload} />;
      }
      return <UnavailableState toolName="Backend" reason="Schema no disponible." />;
    }

    case "DEPLOYMENT_OUTPUT":
      if (output.payload && "dryRun" in output.payload) {
        return <DeploymentPreviewView payload={output.payload} />;
      }
      return <UnavailableState toolName="Deployment" reason="Plan de deploy no disponible." />;

    default:
      return <UnavailableState toolName="Preview" reason={`Tipo no soportado: ${output.type}`} />;
  }
}
