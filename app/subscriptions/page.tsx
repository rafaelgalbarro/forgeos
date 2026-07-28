import type { Metadata } from "next";
import { SubscriptionsPanel } from "@/components/commercial/SubscriptionsPanel";

export const metadata: Metadata = {
  title: "Suscripciones — ForgeOS",
  description: "Gestiona tu suscripción, trial y cambios de plan.",
};

export default function SubscriptionsPage() {
  return <SubscriptionsPanel />;
}
