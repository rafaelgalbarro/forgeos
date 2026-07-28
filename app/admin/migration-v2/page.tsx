import { loadMigrationDashboardSummary } from "@/src/core/migration/dashboard/summary";
import { MigrationV2Dashboard } from "@/components/admin/MigrationV2Dashboard";

export const metadata = {
  title: "Migration V2 — ForgeOS Admin",
  description: "PROGRAM 6070 — Legacy migration progress, flags, fallbacks, divergences",
};

export default function MigrationV2AdminPage() {
  const summary = loadMigrationDashboardSummary();
  return <MigrationV2Dashboard summary={summary} />;
}
