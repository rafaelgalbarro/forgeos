"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filterProductCommands } from "@/lib/navigation/command-registry";
import { dispatchExperienceCommand } from "@/src/core/application/command-bridges";
import type { ExperienceCommandName } from "@/src/core/application/command-bridges";

const EXPERIENCE_ACTIONS: {
  id: string;
  label: string;
  description: string;
  command: ExperienceCommandName;
  keywords: string[];
}[] = [
  {
    id: "xp-create-venture",
    label: "Create Venture",
    description: "Commands V2 bridge → Creator",
    command: "CreateVenture",
    keywords: ["create", "venture", "empresa"],
  },
  {
    id: "xp-start-mission",
    label: "Start Mission",
    description: "Commands V2 → Mission Control",
    command: "StartMission",
    keywords: ["start", "mission", "misión"],
  },
  {
    id: "xp-open-studio",
    label: "Open Studio",
    description: "Commands V2 → Studio",
    command: "OpenStudio",
    keywords: ["studio", "outputs"],
  },
  {
    id: "xp-request-change",
    label: "Request Change",
    description: "Commands V2 → Studio change request",
    command: "RequestChange",
    keywords: ["change", "cambio"],
  },
  {
    id: "xp-build",
    label: "Build",
    description: "Commands V2 StartBuild (dry-run)",
    command: "StartBuild",
    keywords: ["build"],
  },
  {
    id: "xp-preview",
    label: "Preview",
    description: "Commands V2 CreatePreview",
    command: "CreatePreview",
    keywords: ["preview"],
  },
  {
    id: "xp-release",
    label: "Create Release",
    description: "Commands V2 CreateRelease",
    command: "CreateRelease",
    keywords: ["release"],
  },
  {
    id: "xp-deploy-preview",
    label: "Deploy Preview",
    description: "Commands V2 DeployPreview (no providers on client)",
    command: "DeployPreview",
    keywords: ["deploy", "preview"],
  },
  {
    id: "xp-review-company",
    label: "Review Company",
    description: "Commands V2 → Company OS",
    command: "ReviewCompany",
    keywords: ["company", "review"],
  },
  {
    id: "xp-pause-mission",
    label: "Pause Mission",
    description: "Commands V2 PauseMission",
    command: "PauseMission",
    keywords: ["pause", "pausar"],
  },
];

/** Global Cmd/Ctrl+K palette for non-OS shell routes (PROGRAM 6060). */
export function ForgeCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions = EXPERIENCE_ACTIONS.filter(
      (a) =>
        !q ||
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.includes(q))
    ).map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      run: () => {
        const outcome = dispatchExperienceCommand({ name: a.command, dryRun: true });
        if (outcome.href) router.push(outcome.href);
      },
    }));

    const nav = filterProductCommands(query, 8).map((c) => ({
      id: `nav-${c.id}`,
      label: c.label,
      description: c.description ?? "",
      run: () => {
        if (c.href) router.push(c.href);
      },
    }));

    return [...actions, ...nav].slice(0, 14);
  }, [query, router]);

  if (!open) return null;

  return (
    <div className="fhis-os-overlay" role="dialog" aria-modal aria-label="Command Palette">
      <button type="button" className="fhis-os-overlay-backdrop" onClick={() => setOpen(false)} />
      <div className="fhis-os-palette">
        <input
          autoFocus
          className="fhis-os-palette-input"
          placeholder="Create Venture, Start Mission, Open Studio, Build…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results[0]) {
              setOpen(false);
              results[0].run();
            }
          }}
        />
        <ul className="fhis-os-palette-list">
          {results.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  cmd.run();
                }}
              >
                <strong>{cmd.label}</strong>
                {cmd.description && <span>{cmd.description}</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="fhis-os-palette-hint">Ctrl/Cmd+K · Commands V2 bridges · Esc</p>
      </div>
    </div>
  );
}
