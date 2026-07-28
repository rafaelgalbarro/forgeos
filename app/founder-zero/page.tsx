import { FounderZeroDashboard } from "@/components/founder-zero/FounderZeroDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Founder Zero — ForgeOS",
  description: "Program 4000 — First Venture Validation Pipeline",
};

export default function FounderZeroPage() {
  return (
    <OsModuleFrame
      title="Founder Zero"
      description="Validación end-to-end de venture reutilizando todos los motores ForgeOS"
    >
      <FounderZeroDashboard showLabLink />
    </OsModuleFrame>
  );
}
