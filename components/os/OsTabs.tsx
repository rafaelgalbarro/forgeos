"use client";

import Link from "next/link";
import { useOsShell } from "@/lib/os/shell-context";

export function OsTabs() {
  const { layout } = useOsShell();

  if (layout.tabs.length === 0) return null;

  return (
    <div className="fhis-os-tabs" role="tablist">
      {layout.tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={tab.active ? "fhis-os-tab fhis-os-tab-active" : "fhis-os-tab"}
          role="tab"
          aria-selected={tab.active}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
