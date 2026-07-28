"use client";

import type { ReactNode } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface Props {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}

export function WorkspacePanelShell({
  title,
  subtitle,
  empty,
  emptyTitle = "Sin datos",
  emptyDescription = "Los datos aparecerán cuando haya actividad post-deploy.",
  children,
}: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title={title} subtitle={subtitle} />
        {empty ? (
          <EmptyState icon="◎" title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </Stack>
    </Panel>
  );
}
