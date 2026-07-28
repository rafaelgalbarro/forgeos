import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Card } from "@/components/ui/fhis/Card";

export const metadata = {
  title: "Engineering Governance — ForgeOS",
  description: "Program 4290 — Engineering zones and parallel execution metadata",
};

interface Zone {
  id: string;
  label: string;
  owner: string;
  paths: string[];
  programs: string[];
  parallelSafe: boolean;
}

interface CompletedProgram {
  id: number;
  name: string;
  status: string;
}

interface EngineeringStatus {
  program: number;
  name: string;
  status: string;
  version: string;
  architectureOwner: string;
  zones: Zone[];
  completedPrograms: CompletedProgram[];
}

function loadStatus(): EngineeringStatus {
  const path = join(process.cwd(), "docs", "engineering", "status.json");
  return JSON.parse(readFileSync(path, "utf-8")) as EngineeringStatus;
}

export default function EngineeringGovernancePage() {
  const status = loadStatus();

  return (
    <OsModuleFrame
      title="Engineering Governance"
      description={`Program ${status.program} — ${status.name} (${status.status})`}
    >
      <p style={{ marginBottom: 16, color: "var(--fhis-color-text-muted)", fontSize: 14 }}>
        Documentation-only dashboard. No engines loaded. Source:{" "}
        <code>docs/engineering/status.json</code>
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Governance docs</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.8 }}>
          <li>
            <Link href="/docs">Docs hub</Link> — see <code>docs/engineering/README.md</code> in repo
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Safe zones</h2>
        <div className="fhis-os-build-grid">
          {status.zones.map((zone) => (
            <Card key={zone.id} className="fhis-os-build-card">
              <h3>{zone.label}</h3>
              <p>
                <strong>Owner:</strong> {zone.owner}
              </p>
              <p>
                <strong>Programs:</strong> {zone.programs.join(", ")}
              </p>
              <p>
                <strong>Parallel safe:</strong> {zone.parallelSafe ? "Yes" : "No — one agent"}
              </p>
              <p style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                {zone.paths.join(" · ")}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Programs</h2>
        <div className="fhis-os-build-grid">
          {status.completedPrograms.map((prog) => (
            <Card key={prog.id} className="fhis-os-build-card">
              <h3>
                {prog.id} — {prog.name}
              </h3>
              <p>{prog.status}</p>
            </Card>
          ))}
        </div>
      </section>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
        Architecture Owner: {status.architectureOwner} · v{status.version}
      </p>
    </OsModuleFrame>
  );
}
