import Link from "next/link";
import { SettingsView } from "@/components/auth/SettingsView";

export const metadata = { title: "Settings — ForgeOS" };

/** PROGRAM 6060 — Settings hub (auth preferences + OS links). */
export default function SettingsPage() {
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", maxWidth: 900 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Settings</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.75 }}>
          Preferencias de cuenta y accesos al sistema. Mission Control es la entrada operativa V2.
        </p>
        <nav style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
          <Link href="/mission-control">Mission Control</Link>
          <Link href="/activity">Activity</Link>
          <Link href="/os/settings">OS Settings</Link>
          <Link href="/ai">Providers</Link>
        </nav>
      </header>
      <SettingsView />
    </div>
  );
}
