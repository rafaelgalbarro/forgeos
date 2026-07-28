"use client";

import type { ReactNode } from "react";
import { OsTabs } from "./OsTabs";
import { OsFloatingPanels } from "./OsFloatingPanels";

export function OsWorkspace({ children }: { children: ReactNode }) {
  return (
    <main className="fhis-os-workspace">
      <OsTabs />
      <div className="fhis-os-workspace-content">{children}</div>
      <OsFloatingPanels />
    </main>
  );
}
