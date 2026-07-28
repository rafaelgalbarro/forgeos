import type { Metadata } from "next";
import { CommercialPricingView } from "@/components/commercial/CommercialPricingView";

export const metadata: Metadata = {
  title: "Precios — ForgeOS",
  description: "Planes Starter, Pro, Business y Enterprise para ForgeOS SaaS.",
};

export default function PricingRoute() {
  return <CommercialPricingView />;
}
