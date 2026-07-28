import type { Metadata } from "next";
import { PrivacyPage } from "@/components/launch/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacidad — ForgeOS",
  description: "Política de privacidad de ForgeOS en beta privada.",
};

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
