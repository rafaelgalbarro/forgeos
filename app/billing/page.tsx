import type { Metadata } from "next";
import { BillingPortal } from "@/components/commercial/BillingPortal";

export const metadata: Metadata = {
  title: "Facturación — ForgeOS",
  description: "Portal de facturación y suscripciones — Program 6000",
};

export default function BillingPage() {
  return <BillingPortal />;
}
