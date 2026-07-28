import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/founder-journey/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding — ForgeOS",
  description: "Recorrido del fundador: perfil, empresa, mercado y primera venture.",
};

export default function OnboardingRoute() {
  return <OnboardingWizard />;
}
