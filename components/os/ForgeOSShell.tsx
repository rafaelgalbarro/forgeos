"use client";

import type { ReactNode } from "react";
import { OsShellProvider } from "@/lib/os/shell-context";
import { OsTopBar } from "./OsTopBar";
import { OsSidebar } from "./OsSidebar";
import { OsDock } from "./OsDock";
import { OsWorkspace } from "./OsWorkspace";
import { OsCommandPalette } from "./OsCommandPalette";
import { OsUniversalSearch } from "./OsUniversalSearch";
import { OsNotificationCenter } from "./OsNotificationCenter";

export function ForgeOSShell({ children }: { children: ReactNode }) {
  return (
    <OsShellProvider>
      <div className="fhis-os-shell">
        <OsTopBar />
        <div className="fhis-os-body">
          <OsSidebar />
          <OsWorkspace>{children}</OsWorkspace>
        </div>
        <OsDock />
        <OsCommandPalette />
        <OsUniversalSearch />
        <OsNotificationCenter />
      </div>
    </OsShellProvider>
  );
}
