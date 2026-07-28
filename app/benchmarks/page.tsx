import { BenchmarksPageClient } from "./BenchmarksPageClient";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Benchmarks — ForgeOS Intelligence Network",
  description: "Benchmarks agregados y anonimizados de la red colectiva",
};

export default function BenchmarksPage() {
  return (
    <OsModuleFrame
      title="Benchmarks de Red"
      description="Comparativas agregadas y anonimizadas — sin datos crudos cross-org"
    >
      <BenchmarksPageClient />
    </OsModuleFrame>
  );
}
